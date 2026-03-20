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
    `);

    // Ensure columns exist for existing databases
    try { database.exec("ALTER TABLE despesas ADD COLUMN descricao TEXT DEFAULT ''"); } catch (e) {}
    try { database.exec("ALTER TABLE salarios ADD COLUMN descricao TEXT DEFAULT ''"); } catch (e) {}
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
  app.get("/api/pessoas", (req, res) => {
    const data = db.prepare("SELECT * FROM pessoas").all();
    res.json(data);
  });

  app.post("/api/pessoas", (req, res) => {
    const { nome, cor } = req.body;
    const result = db.prepare("INSERT INTO pessoas (nome, cor) VALUES (?, ?)").run(nome, cor);
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
      res.json({ id: result.lastInsertRowid, nome });
    } catch (e) {
      res.status(400).json({ error: "Categoria já existe" });
    }
  });

  app.get("/api/despesas", (req, res) => {
    const data = db.prepare(`
      SELECT d.*, p.nome as origem_nome, c.nome as categoria_nome 
      FROM despesas d
      JOIN pessoas p ON d.origem_id = p.id
      JOIN categorias c ON d.categoria_id = c.id
    `).all();
    res.json(data);
  });

  app.post("/api/despesas", (req, res) => {
    const { data, valor, descricao, origem_id, destino, categoria_id } = req.body;
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
    res.json({ id: result.lastInsertRowid, data, valor: roundedValor, descricao, origem_id, destino, categoria_id });
  });

  app.get("/api/salarios", (req, res) => {
    const data = db.prepare(`
      SELECT s.*, p.nome as recebedor_nome 
      FROM salarios s
      JOIN pessoas p ON s.recebedor_id = p.id
    `).all();
    res.json(data);
  });

  app.post("/api/salarios", (req, res) => {
    const { data, valor, descricao, recebedor_id } = req.body;
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
    res.json({ id: result.lastInsertRowid, data, valor: roundedValor, descricao, recebedor_id });
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
