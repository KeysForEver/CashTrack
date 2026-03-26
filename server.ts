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
        data TEXT NOT NULL,
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
        data TEXT NOT NULL,
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
    try { database.exec("ALTER TABLE despesas ADD COLUMN descricao TEXT DEFAULT ''"); } catch (e) {}
    try { database.exec("ALTER TABLE salarios ADD COLUMN descricao TEXT DEFAULT ''"); } catch (e) {}
    try { database.exec("ALTER TABLE logs ADD COLUMN data_registro TEXT"); } catch (e) {}
    try { database.exec("ALTER TABLE logs ADD COLUMN destino TEXT"); } catch (e) {}
    try { database.exec("ALTER TABLE logs ADD COLUMN categoria_id INTEGER"); } catch (e) {}
  };

  // Normalize dates in despesas and salarios to YYYY-MM-DD
  const normalizeDates = (database: Database.Database) => {
    const tables = [
      { name: 'despesas', col: 'data' },
      { name: 'salarios', col: 'data' }
    ];
    
    for (const table of tables) {
      const records = database.prepare(`SELECT id, ${table.col} FROM ${table.name}`).all();
      for (const r of records as any[]) {
        const val = r[table.col];
        if (val && val.includes('/')) {
          const parts = val.split('/');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            const normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            database.prepare(`UPDATE ${table.name} SET ${table.col} = ? WHERE id = ?`).run(normalized, r.id);
          }
        }
      }
    }
  };

  initDb(db);
  normalizeDates(db);

  // Backup endpoint
  app.get("/api/backup", (req, res) => {
    try {
      const zip = new AdmZip();
      // Add the sqlite file to the zip
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
  app.post("/api/restore", upload.single("backup"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    try {
      const filePath = req.file.path;
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      
      // Find the database file in the zip
      const dbEntry = zipEntries.find(entry => entry.entryName === "database.sqlite");
      
      if (!dbEntry) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: "Arquivo de backup inválido (database.sqlite não encontrado)" });
      }

      // Close current connection
      db.close();

      // Extract and replace
      zip.extractEntryTo(dbEntry, ".", false, true);

      // Reopen connection
      db = new Database(DB_PATH);
      initDb(db);
      normalizeDates(db);

      // Clean up upload
      fs.unlinkSync(filePath);

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao restaurar backup" });
    }
  });

  // API Routes
  app.use("/api", (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  app.get("/api/pessoas", (req, res) => {
    const data = db.prepare("SELECT * FROM pessoas").all();
    res.json(data);
  });

  app.post("/api/pessoas", (req, res) => {
    const { nome, cor } = req.body;
    const result = db.prepare("INSERT INTO pessoas (nome, cor) VALUES (?, ?)").run(nome, cor);
    
    // Log the creation
    db.prepare(
      "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(new Date().toISOString(), `Nova Pessoa: ${nome}`, 0, 0, 'Pessoa', result.lastInsertRowid, result.lastInsertRowid);

    res.json({ id: result.lastInsertRowid, nome, cor });
  });

  app.get("/api/categorias", (req, res) => {
    const data = db.prepare("SELECT * FROM categorias").all();
    res.json(data);
  });

  app.post("/api/categorias", (req, res) => {
    const { nome } = req.body;
    try {
      const result = db.prepare("INSERT INTO categorias (nome) VALUES (?)").run(nome);
      
      // Log the creation
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Nova Categoria: ${nome}`, 0, 0, 'Categoria', result.lastInsertRowid, result.lastInsertRowid);

      res.json({ id: result.lastInsertRowid, nome });
    } catch (e) {
      res.status(400).json({ error: "Categoria já existe" });
    }
  });

  app.put("/api/categorias/:id", (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    try {
      const old = db.prepare("SELECT * FROM categorias WHERE id = ?").get(id);
      db.prepare("UPDATE categorias SET nome = ? WHERE id = ?").run(nome, id);
      
      // Log the update
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Categoria Alterada: ${old.nome} -> ${nome}`, 0, 0, 'Categoria', id, id);

      res.json({ id, nome });
    } catch (e) {
      res.status(400).json({ error: "Erro ao atualizar categoria" });
    }
  });

  app.delete("/api/categorias/:id", (req, res) => {
    const { id } = req.params;
    try {
      const old = db.prepare("SELECT * FROM categorias WHERE id = ?").get(id);
      
      // Check if there are expenses using this category
      const count = db.prepare("SELECT COUNT(*) as count FROM despesas WHERE categoria_id = ?").get(id).count;
      if (count > 0) {
        return res.status(400).json({ error: "Não é possível excluir uma categoria que possui despesas vinculadas" });
      }

      db.prepare("DELETE FROM categorias WHERE id = ?").run(id);
      
      // Log the deletion
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Categoria Excluída: ${old.nome}`, 0, 0, 'Categoria', id, id);

      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Erro ao excluir categoria" });
    }
  });

  app.get("/api/despesas", (req, res) => {
    const data = db.prepare(`
      SELECT d.*, p.nome as origem_nome, c.nome as categoria_nome 
      FROM despesas d
      LEFT JOIN pessoas p ON d.origem_id = p.id
      LEFT JOIN categorias c ON d.categoria_id = c.id
    `).all();
    res.json(data);
  });

  app.post("/api/despesas", (req, res) => {
    const { data, valor, descricao, origem_id, destino, categoria_id } = req.body;
    
    if (!data || isNaN(Number(valor)) || !origem_id || !categoria_id) {
      return res.status(400).json({ error: "Dados incompletos ou inválidos (valor, origem ou categoria)." });
    }

    const roundedValor = Math.round(Number(valor) * 100) / 100;
    
    // Check for duplicate
    const existing = db.prepare(`
      SELECT id FROM despesas 
      WHERE data = ? AND valor = ? AND descricao = ? AND origem_id = ? AND destino = ? AND categoria_id = ?
    `).get(data, roundedValor, descricao || '', origem_id, destino, categoria_id);

    if (existing) {
      return res.status(400).json({ error: "Esta despesa já foi lançada (duplicada)." });
    }

    const result = db.prepare(
      "INSERT INTO despesas (data, valor, descricao, origem_id, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(data, roundedValor, descricao || '', origem_id, destino, categoria_id);

    // Log the creation
    db.prepare(
      "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id, data_registro, destino, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(new Date().toISOString(), `Lançamento inicial: Saída S${result.lastInsertRowid} - ${descricao || 'Despesa'}`, 0, roundedValor, 'Despesa', result.lastInsertRowid, origem_id, data, destino, categoria_id);

    res.json({ id: result.lastInsertRowid, data, valor: roundedValor, descricao, origem_id, destino, categoria_id });
  });

  app.get("/api/salarios", (req, res) => {
    const data = db.prepare(`
      SELECT s.*, p.nome as recebedor_nome 
      FROM salarios s
      LEFT JOIN pessoas p ON s.recebedor_id = p.id
    `).all();
    res.json(data);
  });

  app.post("/api/salarios", (req, res) => {
    const { data, valor, descricao, recebedor_id } = req.body;
    
    if (!data || isNaN(Number(valor)) || !recebedor_id) {
      return res.status(400).json({ error: "Dados incompletos ou inválidos (valor ou recebedor)." });
    }

    const roundedValor = Math.round(Number(valor) * 100) / 100;

    // Check for duplicate
    const existing = db.prepare(`
      SELECT id FROM salarios 
      WHERE data = ? AND valor = ? AND descricao = ? AND recebedor_id = ?
    `).get(data, roundedValor, descricao || '', recebedor_id);

    if (existing) {
      return res.status(400).json({ error: "Este lançamento de entrada já existe (duplicado)." });
    }

    const result = db.prepare(
      "INSERT INTO salarios (data, valor, descricao, recebedor_id) VALUES (?, ?, ?, ?)"
    ).run(data, roundedValor, descricao || '', recebedor_id);

    // Log the creation
    db.prepare(
      "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id, data_registro, destino) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(new Date().toISOString(), `Lançamento inicial: Entrada E${result.lastInsertRowid} - ${descricao || 'Entrada'}`, 0, roundedValor, 'Entrada', result.lastInsertRowid, recebedor_id, data, 'Entrada');

    res.json({ id: result.lastInsertRowid, data, valor: roundedValor, descricao, recebedor_id });
  });

  app.patch("/api/despesas/:id", (req, res) => {
    const { id } = req.params;
    const { valor } = req.body;

    if (isNaN(Number(valor))) {
      return res.status(400).json({ error: "Valor inválido." });
    }

    const roundedValor = Math.round(Number(valor) * 100) / 100;

    try {
      const oldRecord = db.prepare("SELECT valor, descricao, origem_id FROM despesas WHERE id = ?").get(id) as any;
      if (!oldRecord) return res.status(404).json({ error: "Despesa não encontrada" });

      db.prepare("UPDATE despesas SET valor = ? WHERE id = ?").run(roundedValor, id);
      
      // Log the change
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Alteração de valor: Saída S${id} - ${oldRecord.descricao}`, oldRecord.valor, roundedValor, 'Despesa', id, oldRecord.origem_id);

      res.json({ success: true, valor: roundedValor });
    } catch (e) {
      res.status(500).json({ error: "Erro ao atualizar valor da despesa." });
    }
  });

  app.patch("/api/salarios/:id", (req, res) => {
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

      // Log the change
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Alteração de valor: Entrada E${id} - ${oldRecord.descricao}`, oldRecord.valor, roundedValor, 'Entrada', id, oldRecord.recebedor_id);

      res.json({ success: true, valor: roundedValor });
    } catch (e) {
      res.status(500).json({ error: "Erro ao atualizar valor da entrada." });
    }
  });

  app.delete("/api/despesas/:id", (req, res) => {
    const { id } = req.params;
    try {
      const oldRecord = db.prepare("SELECT valor, descricao, origem_id FROM despesas WHERE id = ?").get(id) as any;
      if (!oldRecord) return res.status(404).json({ error: "Despesa não encontrada" });

      db.prepare("DELETE FROM despesas WHERE id = ?").run(id);

      // Log the deletion
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Exclusão: Saída S${id} - ${oldRecord.descricao}`, oldRecord.valor, 0, 'Despesa', id, oldRecord.origem_id);

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Erro ao excluir despesa." });
    }
  });

  app.delete("/api/salarios/:id", (req, res) => {
    const { id } = req.params;
    try {
      const oldRecord = db.prepare("SELECT valor, descricao, recebedor_id FROM salarios WHERE id = ?").get(id) as any;
      if (!oldRecord) return res.status(404).json({ error: "Entrada não encontrada" });

      db.prepare("DELETE FROM salarios WHERE id = ?").run(id);

      // Log the deletion
      db.prepare(
        "INSERT INTO logs (timestamp, descricao, valor_antigo, valor_novo, tipo, registro_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(new Date().toISOString(), `Exclusão: Entrada E${id} - ${oldRecord.descricao}`, oldRecord.valor, 0, 'Entrada', id, oldRecord.recebedor_id);

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Erro ao excluir entrada." });
    }
  });

  app.get("/api/logs", (req, res) => {
    const data = db.prepare(`
      SELECT l.*, p.nome as pessoa_nome, c.nome as categoria_nome 
      FROM logs l
      LEFT JOIN pessoas p ON l.pessoa_id = p.id
      LEFT JOIN categorias c ON l.categoria_id = c.id
      ORDER BY l.timestamp DESC
    `).all();
    res.json(data);
  });

  app.delete("/api/pessoas/:id", (req, res) => {
    const { id } = req.params;
    
    const deleteTransaction = db.transaction(() => {
      // Delete associated expenses
      db.prepare("DELETE FROM despesas WHERE origem_id = ?").run(id);
      // Delete associated salaries
      db.prepare("DELETE FROM salarios WHERE recebedor_id = ?").run(id);
      // Delete the person
      db.prepare("DELETE FROM pessoas WHERE id = ?").run(id);
    });

    try {
      deleteTransaction();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Erro ao excluir pessoa e seus dados." });
    }
  });

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
