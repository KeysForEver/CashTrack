import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import AdmZip from "adm-zip";
import multer from "multer";

const upload = multer({ dest: "uploads/" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const DB_PATH = "./database.sqlite";
  let db = new Database(DB_PATH);

  const initDb = (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS pessoas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS despesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_compra TEXT NOT NULL,
        data_pagamento TEXT NOT NULL,
        valor REAL NOT NULL,
        descricao TEXT DEFAULT '',
        origem_id INTEGER NOT NULL,
        destino TEXT NOT NULL,
        categoria_id INTEGER NOT NULL,
        FOREIGN KEY(origem_id) REFERENCES pessoas(id),
        FOREIGN KEY(categoria_id) REFERENCES categorias(id)
      );

      CREATE TABLE IF NOT EXISTS salarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_pagamento TEXT NOT NULL,
        valor REAL NOT NULL,
        descricao TEXT DEFAULT '',
        recebedor_id INTEGER NOT NULL,
        FOREIGN KEY(recebedor_id) REFERENCES pessoas(id)
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        descricao TEXT NOT NULL,
        valor_antigo REAL,
        valor_novo REAL,
        tipo TEXT NOT NULL,
        registro_id INTEGER NOT NULL,
        pessoa_id INTEGER,
        data_registro TEXT,
        destino TEXT,
        categoria_id INTEGER
      );
    `);

    // Ensure columns exist for existing databases
    try { database.exec("ALTER TABLE despesas ADD COLUMN data_compra TEXT"); } catch (e) {}
    try { database.exec("ALTER TABLE despesas ADD COLUMN data_pagamento TEXT"); } catch (e) {}
    try { database.exec("ALTER TABLE salarios ADD COLUMN data_pagamento TEXT"); } catch (e) {}
    
    // Migration for old 'data' column
    try {
      database.exec(`
        UPDATE despesas SET data_compra = data, data_pagamento = data WHERE data_compra IS NULL;
        UPDATE salarios SET data_pagamento = data WHERE data_pagamento IS NULL;
      `);
    } catch (e) {}

    try { database.exec("ALTER TABLE despesas ADD COLUMN descricao TEXT DEFAULT ''"); } catch (e) {}
    try { database.exec("ALTER TABLE salarios ADD COLUMN descricao TEXT DEFAULT ''"); } catch (e) {}
    try { database.exec("ALTER TABLE logs ADD COLUMN data_registro TEXT"); } catch (e) {}
    try { database.exec("ALTER TABLE logs ADD COLUMN destino TEXT"); } catch (e) {}
    try { database.exec("ALTER TABLE logs ADD COLUMN categoria_id INTEGER"); } catch (e) {}
  };

  // Normalize dates in despesas and salarios to YYYY-MM-DD
    const normalizeDates = (database: Database.Database) => {
      const tables = [
        { name: 'despesas', cols: ['data_compra', 'data_pagamento'] },
        { name: 'salarios', cols: ['data_pagamento'] }
      ];
      
      for (const table of tables) {
        for (const col of table.cols) {
          const records = database.prepare(`SELECT id, ${col} FROM ${table.name} WHERE ${col} IS NOT NULL`).all();
          for (const r of records as any[]) {
            const val = r[col];
            if (val && val.includes('/')) {
              const parts = val.split('/');
              if (parts.length === 3) {
                const [d, m, y] = parts;
                const normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                database.prepare(`UPDATE ${table.name} SET ${col} = ? WHERE id = ?`).run(normalized, r.id);
              }
            }
          }
        }
      }
    };

  const seedData = (database: Database.Database) => {
    const pessoasCount = database.prepare("SELECT COUNT(*) as count FROM pessoas").get().count;
    if (pessoasCount === 0) {
      console.log("Seeding example data...");
      
      // Insert Pessoas
      const p1 = database.prepare("INSERT INTO pessoas (nome, cor) VALUES (?, ?)").run("Wallace", "#4f46e5");
      const p2 = database.prepare("INSERT INTO pessoas (nome, cor) VALUES (?, ?)").run("Janis", "#ec4899");
      
      // Insert Categorias
      const c1 = database.prepare("INSERT INTO categorias (nome) VALUES (?)").run("Alimentação");
      const c2 = database.prepare("INSERT INTO categorias (nome) VALUES (?)").run("Lazer");
      const c3 = database.prepare("INSERT INTO categorias (nome) VALUES (?)").run("Transporte");
      const c4 = database.prepare("INSERT INTO categorias (nome) VALUES (?)").run("Aluguel");
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // Insert Salarios (Entradas)
      database.prepare("INSERT INTO salarios (data_pagamento, valor, descricao, recebedor_id) VALUES (?, ?, ?, ?)").run(yesterday, 5000, "Salário Mensal", p1.lastInsertRowid);
      database.prepare("INSERT INTO salarios (data_pagamento, valor, descricao, recebedor_id) VALUES (?, ?, ?, ?)").run(yesterday, 4500, "Salário Mensal", p2.lastInsertRowid);
      
      // Insert Despesas (Saídas)
      database.prepare("INSERT INTO despesas (data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(today, today, 150, "Jantar", p1.lastInsertRowid, "Dividir", c1.lastInsertRowid);
      database.prepare("INSERT INTO despesas (data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(today, today, 80, "Cinema", p2.lastInsertRowid, "Dividir", c2.lastInsertRowid);
      database.prepare("INSERT INTO despesas (data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(yesterday, yesterday, 2000, "Aluguel Apartamento", p1.lastInsertRowid, "Dividir", c4.lastInsertRowid);
      database.prepare("INSERT INTO despesas (data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(yesterday, yesterday, 50, "Uber", p2.lastInsertRowid, p1.lastInsertRowid.toString(), c3.lastInsertRowid);
      database.prepare("INSERT INTO despesas (data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(yesterday, yesterday, 120, "Supermercado", p1.lastInsertRowid, "Dividir", c1.lastInsertRowid);
      database.prepare("INSERT INTO despesas (data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(today, today, 45, "Farmácia", p2.lastInsertRowid, "Dividir", c1.lastInsertRowid);
      database.prepare("INSERT INTO despesas (data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(today, today, 200, "Presente", p1.lastInsertRowid, p2.lastInsertRowid.toString(), c2.lastInsertRowid);
    }
  };

  initDb(db);
  normalizeDates(db);
  seedData(db);

  const apiRouter = express.Router();

  // Middleware for all API routes
  apiRouter.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Backup endpoint
  apiRouter.get("/backup", (req, res) => {
    try {
      const zip = new AdmZip();
      zip.addLocalFile(DB_PATH);
      const buffer = zip.toBuffer();
      
      res.set("Content-Type", "application/zip");
      res.set("Content-Disposition", `attachment; filename=cashtrack_backup_${new Date().toISOString().split('T')[0]}.zip`);
      res.send(buffer);
    } catch (e) {
      res.status(500).json({ error: "Erro ao gerar backup" });
    }
  });

  // Restore endpoint
  apiRouter.post("/restore", upload.single("backup"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    try {
      const filePath = req.file.path;
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      
      const dbEntry = zipEntries.find(entry => entry.entryName === "database.sqlite");
      
      if (!dbEntry) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: "Arquivo de backup inválido (database.sqlite não encontrado)" });
      }

      db.close();
      zip.extractEntryTo(dbEntry, ".", false, true);
      db = new Database(DB_PATH);
      initDb(db);
      normalizeDates(db);
      fs.unlinkSync(filePath);

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao restaurar backup" });
    }
  });

  // Reset endpoint
  apiRouter.post("/reset", (req, res) => {
    try {
      db.exec(`
        DELETE FROM despesas;
        DELETE FROM salarios;
        DELETE FROM pessoas;
        DELETE FROM categorias;
        DELETE FROM logs;
        DELETE FROM sqlite_sequence WHERE name IN ('despesas', 'salarios', 'pessoas', 'categorias', 'logs');
      `);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao resetar dados" });
    }
  });

  apiRouter.get("/pessoas", (req, res) => {
    const data = db.prepare("SELECT * FROM pessoas").all();
    res.json(data);
  });

  apiRouter.post("/pessoas", (req, res) => {
    const { nome, cor } = req.body;
    const result = db.prepare("INSERT INTO pessoas (nome, cor) VALUES (?, ?)").run(nome, cor);
    
    db.prepare(
      "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(new Date().toISOString(), `Nova Pessoa: ${nome}`, 0, 0, 'Pessoa', result.lastInsertRowid, result.lastInsertRowid);

    res.json({ id: result.lastInsertRowid, nome, cor });
  });

  apiRouter.get("/categorias", (req, res) => {
    const data = db.prepare("SELECT * FROM categorias").all();
    res.json(data);
  });

  apiRouter.post("/categorias", (req, res) => {
    const { nome } = req.body;
    try {
      const result = db.prepare("INSERT INTO categorias (nome) VALUES (?)").run(nome);
      
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Nova Categoria: ${nome}`, 0, 0, 'Categoria', result.lastInsertRowid, result.lastInsertRowid);

      res.json({ id: result.lastInsertRowid, nome });
    } catch (e) {
      res.status(400).json({ error: "Categoria já existe" });
    }
  });

  apiRouter.put("/categorias/:id", (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    try {
      const old = db.prepare("SELECT * FROM categorias WHERE id = ?").get(id) as any;
      db.prepare("UPDATE categorias SET nome = ? WHERE id = ?").run(nome, id);
      
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Categoria Alterada: ${old.nome} -> ${nome}`, 0, 0, 'Categoria', id, id);

      res.json({ id, nome });
    } catch (e) {
      res.status(400).json({ error: "Erro ao atualizar categoria" });
    }
  });

  apiRouter.delete("/categorias/:id", (req, res) => {
    const { id } = req.params;
    try {
      const old = db.prepare("SELECT * FROM categorias WHERE id = ?").get(id) as any;
      
      const count = db.prepare("SELECT COUNT(*) as count FROM despesas WHERE categoria_id = ?").get(id).count;
      if (count > 0) {
        return res.status(400).json({ error: "Não é possível excluir uma categoria que possui despesas vinculadas" });
      }

      db.prepare("DELETE FROM categorias WHERE id = ?").run(id);
      
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Categoria Excluída: ${old.nome}`, 0, 0, 'Categoria', id, id);

      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Erro ao excluir categoria" });
    }
  });

  apiRouter.get("/despesas", (req, res) => {
    const data = db.prepare(`
      SELECT d.*, p.nome as origem_nome, c.nome as categoria_nome 
      FROM despesas d
      LEFT JOIN pessoas p ON d.origem_id = p.id
      LEFT JOIN categorias c ON d.categoria_id = c.id
    `).all();
    res.json(data);
  });

  apiRouter.post("/despesas", (req, res) => {
    const { data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id } = req.body;
    
    if (!data_compra || !data_pagamento || isNaN(Number(valor)) || !origem_id || !categoria_id) {
      return res.status(400).json({ error: "Dados incompletos ou inválidos (valor, origem ou categoria)." });
    }

    const roundedValor = Math.round(Number(valor) * 100) / 100;
    
    const existing = db.prepare(`
      SELECT id FROM despesas 
      WHERE data_compra = ? AND data_pagamento = ? AND valor = ? AND descricao = ? AND origem_id = ? AND destino = ? AND categoria_id = ?
    `).get(data_compra, data_pagamento, roundedValor, descricao || '', origem_id, destino, categoria_id);

    if (existing) {
      return res.status(400).json({ error: "Esta despesa já foi lançada (duplicada)." });
    }

    const result = db.prepare(
      "INSERT INTO despesas (data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(data_compra, data_pagamento, roundedValor, descricao || '', origem_id, destino, categoria_id);

    db.prepare(
      "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id, data_registro, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(new Date().toISOString(), `Lançamento inicial: Saída S${result.lastInsertRowid} - ${descricao || 'Despesa'}`, 0, roundedValor, 'Despesa', result.lastInsertRowid, origem_id, data_pagamento, destino, categoria_id);

    res.json({ id: result.lastInsertRowid, data_compra, data_pagamento, valor: roundedValor, descricao, origem_id, destino, categoria_id });
  });

  apiRouter.get("/salarios", (req, res) => {
    const data = db.prepare(`
      SELECT s.*, p.nome as recebedor_nome 
      FROM salarios s
      LEFT JOIN pessoas p ON s.recebedor_id = p.id
    `).all();
    res.json(data);
  });

  apiRouter.post("/salarios", (req, res) => {
    const { data_pagamento, valor, descricao, recebedor_id } = req.body;
    
    if (!data_pagamento || isNaN(Number(valor)) || !recebedor_id) {
      return res.status(400).json({ error: "Dados incompletos ou inválidos (valor ou recebedor)." });
    }

    const roundedValor = Math.round(Number(valor) * 100) / 100;

    const existing = db.prepare(`
      SELECT id FROM salarios 
      WHERE data_pagamento = ? AND valor = ? AND descricao = ? AND recebedor_id = ?
    `).get(data_pagamento, roundedValor, descricao || '', recebedor_id);

    if (existing) {
      return res.status(400).json({ error: "Este lançamento de entrada já existe (duplicado)." });
    }

    const result = db.prepare(
      "INSERT INTO salarios (data_pagamento, valor, descricao, recebedor_id) VALUES (?, ?, ?, ?)"
    ).run(data_pagamento, roundedValor, descricao || '', recebedor_id);

    db.prepare(
      "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id, data_registro, destino) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(new Date().toISOString(), `Lançamento inicial: Entrada E${result.lastInsertRowid} - ${descricao || 'Entrada'}`, 0, roundedValor, 'Entrada', result.lastInsertRowid, recebedor_id, data_pagamento, 'Entrada');

    res.json({ id: result.lastInsertRowid, data_pagamento, valor: roundedValor, descricao, recebedor_id });
  });

  apiRouter.patch("/despesas/:id", (req, res) => {
    const { id } = req.params;
    const { valor, categoria_id } = req.body;

    try {
      const oldRecord = db.prepare("SELECT valor, descricao, origem_id, categoria_id FROM despesas WHERE id = ?").get(id) as any;
      if (!oldRecord) return res.status(404).json({ error: "Despesa não encontrada" });

      if (valor !== undefined) {
        if (isNaN(Number(valor))) {
          return res.status(400).json({ error: "Valor inválido." });
        }
        const roundedValor = Math.round(Number(valor) * 100) / 100;
        db.prepare("UPDATE despesas SET valor = ? WHERE id = ?").run(roundedValor, id);
        
        db.prepare(
          "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(new Date().toISOString(), `Alteração de valor: Saída S${id} - ${oldRecord.descricao}`, oldRecord.valor, roundedValor, 'Despesa', id, oldRecord.origem_id);
      }

      if (categoria_id !== undefined) {
        db.prepare("UPDATE despesas SET categoria_id = ? WHERE id = ?").run(categoria_id, id);
        
        const oldCat = db.prepare("SELECT nome FROM categorias WHERE id = ?").get(oldRecord.categoria_id) as any;
        const newCat = db.prepare("SELECT nome FROM categorias WHERE id = ?").get(categoria_id) as any;
        
        db.prepare(
          "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(new Date().toISOString(), `Alteração de categoria: Saída S${id} - ${oldRecord.descricao} (${oldCat?.nome || 'Sem Categoria'} -> ${newCat?.nome || 'Sem Categoria'})`, 0, 0, 'Despesa', id, oldRecord.origem_id);
      }

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao atualizar despesa." });
    }
  });

  apiRouter.patch("/salarios/:id", (req, res) => {
    const { id } = req.params;
    const { valor } = req.body;

    if (isNaN(Number(valor))) {
      return res.status(400).json({ error: "Valor inválido." });
    }

    const roundedValor = Math.round(Number(valor) * 100) / 100;

    try {
      const oldRecord = db.prepare("SELECT valor, descricao, recebedor_id FROM salarios WHERE id = ?").get(id) as any;
      if (!oldRecord) return res.status(404).json({ error: "Entrada não encontrada" });

      db.prepare("UPDATE salarios SET valor = ? WHERE id = ?").run(roundedValor, id);

      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Alteração de valor: Entrada E${id} - ${oldRecord.descricao}`, oldRecord.valor, roundedValor, 'Entrada', id, oldRecord.recebedor_id);

      res.json({ success: true, valor: roundedValor });
    } catch (e) {
      res.status(500).json({ error: "Erro ao atualizar valor da entrada." });
    }
  });

  apiRouter.delete("/despesas/:id", (req, res) => {
    const { id } = req.params;
    try {
      const oldRecord = db.prepare("SELECT valor, descricao, origem_id FROM despesas WHERE id = ?").get(id) as any;
      if (!oldRecord) return res.status(404).json({ error: "Despesa não encontrada" });

      db.prepare("DELETE FROM despesas WHERE id = ?").run(id);

      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Exclusão: Saída S${id} - ${oldRecord.descricao}`, oldRecord.valor, 0, 'Despesa', id, oldRecord.origem_id);

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Erro ao excluir despesa." });
    }
  });

  apiRouter.delete("/salarios/:id", (req, res) => {
    const { id } = req.params;
    try {
      const oldRecord = db.prepare("SELECT valor, descricao, recebedor_id FROM salarios WHERE id = ?").get(id) as any;
      if (!oldRecord) return res.status(404).json({ error: "Entrada não encontrada" });

      db.prepare("DELETE FROM salarios WHERE id = ?").run(id);

      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Exclusão: Entrada E${id} - ${oldRecord.descricao}`, oldRecord.valor, 0, 'Entrada', id, oldRecord.recebedor_id);

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Erro ao excluir entrada." });
    }
  });

  apiRouter.get("/logs", (req, res) => {
    const data = db.prepare(`
      SELECT l.*, p.nome as pessoa_nome, c.nome as categoria_nome 
      FROM logs l
      LEFT JOIN pessoas p ON l.pessoa_id = p.id
      LEFT JOIN categorias c ON l.categoria_id = c.id
      ORDER BY l.timestamp DESC
    `).all();
    res.json(data);
  });

  apiRouter.delete("/pessoas/:id", (req, res) => {
    const { id } = req.params;
    
    const deleteTransaction = db.transaction(() => {
      db.prepare("DELETE FROM despesas WHERE origem_id = ?").run(id);
      db.prepare("DELETE FROM salarios WHERE recebedor_id = ?").run(id);
      db.prepare("DELETE FROM pessoas WHERE id = ?").run(id);
    });

    try {
      deleteTransaction();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Erro ao excluir pessoa e seus dados." });
    }
  });

  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
