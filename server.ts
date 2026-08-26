import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Firestore } from "@google-cloud/firestore";
import AdmZip from "adm-zip";
import multer from "multer";

const resolvedDir = typeof import.meta !== "undefined" && import.meta.url
  ? path.dirname(fileURLToPath(import.meta.url))
  : (typeof __dirname !== "undefined" ? __dirname : process.cwd());

const upload = multer({ dest: "uploads/" });

// Robust search for firebase-applet-config.json
function findFirebaseConfigPath(dir: string): string {
  const pathsToTry = [
    path.join(dir, "firebase-applet-config.json"),
    path.join(dir, "..", "firebase-applet-config.json"),
    path.join(process.cwd(), "firebase-applet-config.json")
  ];
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return path.join(dir, "firebase-applet-config.json");
}

// Read Firebase Config
const firebaseConfigPath = findFirebaseConfigPath(resolvedDir);
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));

// Initialize Firebase Cloud Firestore
const db = new Firestore({
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId || "(default)"
});

// Counter helper
async function getNextId(collectionName: string): Promise<number> {
  const counterRef = db.collection("metadata").doc("counters");
  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentId = 0;
    if (counterDoc.exists) {
      currentId = counterDoc.get(collectionName) || 0;
    }
    const nextId = currentId + 1;
    transaction.set(counterRef, { [collectionName]: nextId }, { merge: true });
    return nextId;
  });
}

// Helper to update counters to a specific maximum ID
async function updateCounterToMax(collectionName: string, maxId: number) {
  const counterRef = db.collection("metadata").doc("counters");
  await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentId = 0;
    if (counterDoc.exists) {
      currentId = counterDoc.get(collectionName) || 0;
    }
    if (maxId > currentId) {
      transaction.set(counterRef, { [collectionName]: maxId }, { merge: true });
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Iniciando servidor conectado ao Firestore (${firebaseConfig.projectId})...`);

  app.use(express.json());

  const apiRouter = express.Router();

  // Middleware for all API routes (No-cache headers)
  apiRouter.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // Helper: batch delete a collection
  async function deleteCollection(collectionName: string) {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  // Status Endpoint
  apiRouter.get("/status", (req, res) => {
    res.json({
      database: "firestore",
      databaseId: firebaseConfig.firestoreDatabaseId || "(default)",
      projectId: firebaseConfig.projectId
    });
  });

  // Backup Endpoint
  apiRouter.get("/backup", async (req, res) => {
    try {
      const [pessoasSnap, categoriasSnap, despesasSnap, salariosSnap, logsSnap] = await Promise.all([
        db.collection("pessoas").get(),
        db.collection("categorias").get(),
        db.collection("despesas").get(),
        db.collection("salarios").get(),
        db.collection("logs").get()
      ]);

      const backupData = {
        pessoas: pessoasSnap.docs.map(d => d.data()),
        categorias: categoriasSnap.docs.map(d => d.data()),
        despesas: despesasSnap.docs.map(d => d.data()),
        salarios: salariosSnap.docs.map(d => d.data()),
        logs: logsSnap.docs.map(d => d.data())
      };

      const zip = new AdmZip();
      zip.addFile("backup.json", Buffer.from(JSON.stringify(backupData, null, 2), "utf8"));
      const buffer = zip.toBuffer();

      res.set("Content-Type", "application/zip");
      res.set("Content-Disposition", `attachment; filename=cashtrack_backup_${new Date().toISOString().split("T")[0]}.zip`);
      res.send(buffer);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao gerar backup" });
    }
  });

  // Restore Endpoint
  apiRouter.post("/restore", upload.single("backup"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    try {
      const filePath = req.file.path;
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();

      const jsonEntry = zipEntries.find(entry => entry.entryName === "backup.json");

      if (!jsonEntry) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: "Arquivo de backup inválido (backup.json não encontrado)" });
      }

      const backupData = JSON.parse(jsonEntry.getData().toString("utf8"));

      // Delete existing data
      await Promise.all([
        deleteCollection("pessoas"),
        deleteCollection("categorias"),
        deleteCollection("despesas"),
        deleteCollection("salarios"),
        deleteCollection("logs")
      ]);

      let maxPessoaId = 0;
      let maxCategoriaId = 0;
      let maxDespesaId = 0;
      let maxSalarioId = 0;
      let maxLogId = 0;

      // Restore Firestore
      if (backupData.pessoas && Array.isArray(backupData.pessoas)) {
        const batch = db.batch();
        backupData.pessoas.forEach((p: any) => {
          const idNum = Number(p.id);
          if (idNum > maxPessoaId) maxPessoaId = idNum;
          batch.set(db.collection("pessoas").doc(p.id.toString()), {
            id: idNum,
            nome: p.nome,
            cor: p.cor
          });
        });
        await batch.commit();
      }

      if (backupData.categorias && Array.isArray(backupData.categorias)) {
        const batch = db.batch();
        backupData.categorias.forEach((c: any) => {
          const idNum = Number(c.id);
          if (idNum > maxCategoriaId) maxCategoriaId = idNum;
          batch.set(db.collection("categorias").doc(c.id.toString()), {
            id: idNum,
            nome: c.nome
          });
        });
        await batch.commit();
      }

      if (backupData.despesas && Array.isArray(backupData.despesas)) {
        const batch = db.batch();
        backupData.despesas.forEach((d: any) => {
          const idNum = Number(d.id);
          if (idNum > maxDespesaId) maxDespesaId = idNum;
          batch.set(db.collection("despesas").doc(d.id.toString()), {
            id: idNum,
            data_compra: d.data_compra,
            data_pagamento: d.data_pagamento,
            valor: Number(d.valor),
            descricao: d.descricao || "",
            origem_id: Number(d.origem_id),
            destino: d.destino,
            categoria_id: Number(d.categoria_id)
          });
        });
        await batch.commit();
      }

      if (backupData.salarios && Array.isArray(backupData.salarios)) {
        const batch = db.batch();
        backupData.salarios.forEach((s: any) => {
          const idNum = Number(s.id);
          if (idNum > maxSalarioId) maxSalarioId = idNum;
          batch.set(db.collection("salarios").doc(s.id.toString()), {
            id: idNum,
            data_pagamento: s.data_pagamento,
            valor: Number(s.valor),
            descricao: s.descricao || "",
            recebedor_id: Number(s.recebedor_id)
          });
        });
        await batch.commit();
      }

      if (backupData.logs && Array.isArray(backupData.logs)) {
        const batch = db.batch();
        backupData.logs.forEach((l: any) => {
          const idNum = Number(l.id);
          if (idNum > maxLogId) maxLogId = idNum;
          batch.set(db.collection("logs").doc(l.id.toString()), {
            id: idNum,
            timestamp: l.timestamp,
            descricao: l.descricao,
            valor_antigo: l.valor_antigo !== undefined && l.valor_antigo !== null ? Number(l.valor_antigo) : null,
            valor_novo: l.valor_novo !== undefined && l.valor_novo !== null ? Number(l.valor_novo) : null,
            tipo: l.tipo,
            registro_id: l.registro_id,
            pessoa_id: l.pessoa_id !== undefined && l.pessoa_id !== null ? Number(l.pessoa_id) : null,
            data_registro: l.data_registro || null,
            destino: l.destino || null,
            categoria_id: l.categoria_id !== undefined && l.categoria_id !== null ? Number(l.categoria_id) : null
          });
        });
        await batch.commit();
      }

      // Set counters in Firestore
      await db.collection("metadata").doc("counters").set({
        pessoas: maxPessoaId,
        categorias: maxCategoriaId,
        despesas: maxDespesaId,
        salarios: maxSalarioId,
        logs: maxLogId
      });

      fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao restaurar backup" });
    }
  });

  // Reset Endpoint
  apiRouter.post("/reset", async (req, res) => {
    try {
      await Promise.all([
        deleteCollection("pessoas"),
        deleteCollection("categorias"),
        deleteCollection("despesas"),
        deleteCollection("salarios"),
        deleteCollection("logs")
      ]);

      await db.collection("metadata").doc("counters").set({
        pessoas: 0,
        categorias: 0,
        despesas: 0,
        salarios: 0,
        logs: 0
      });

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao resetar dados" });
    }
  });

  // Pessoas Endpoints
  apiRouter.get("/pessoas", async (req, res) => {
    try {
      const snap = await db.collection("pessoas").get();
      const list = snap.docs.map(doc => doc.data());
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao buscar pessoas" });
    }
  });

  apiRouter.post("/pessoas", async (req, res) => {
    try {
      const { nome, cor } = req.body;
      if (!nome || !cor) {
        return res.status(400).json({ error: "Dados inválidos." });
      }

      const nextId = await getNextId("pessoas");

      await db.collection("pessoas").doc(nextId.toString()).set({
        id: nextId,
        nome,
        cor
      });

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Nova Pessoa: ${nome}`,
        valor_antigo: 0,
        valor_novo: 0,
        tipo: "Pessoa",
        registro_id: nextId,
        pessoa_id: nextId
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json({ id: nextId, nome, cor });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao criar pessoa" });
    }
  });

  apiRouter.delete("/pessoas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);

      const despesasSnap = await db.collection("despesas").where("origem_id", "==", idNum).get();
      const salariosSnap = await db.collection("salarios").where("recebedor_id", "==", idNum).get();

      const batch = db.batch();
      despesasSnap.docs.forEach((doc) => batch.delete(doc.ref));
      salariosSnap.docs.forEach((doc) => batch.delete(doc.ref));
      batch.delete(db.collection("pessoas").doc(id));
      await batch.commit();

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao excluir pessoa e seus dados" });
    }
  });

  // Categorias Endpoints
  apiRouter.get("/categorias", async (req, res) => {
    try {
      const snap = await db.collection("categorias").get();
      const list = snap.docs.map(doc => doc.data());
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao buscar categorias" });
    }
  });

  apiRouter.post("/categorias", async (req, res) => {
    try {
      const { nome } = req.body;
      if (!nome) {
        return res.status(400).json({ error: "Nome inválido." });
      }

      // Check for duplicate
      const existingSnap = await db.collection("categorias").where("nome", "==", nome).limit(1).get();
      if (!existingSnap.empty) {
        return res.json(existingSnap.docs[0].data());
      }

      const nextId = await getNextId("categorias");

      await db.collection("categorias").doc(nextId.toString()).set({
        id: nextId,
        nome
      });

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Nova Categoria: ${nome}`,
        valor_antigo: 0,
        valor_novo: 0,
        tipo: "Categoria",
        registro_id: nextId,
        categoria_id: nextId
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json({ id: nextId, nome });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao criar categoria" });
    }
  });

  apiRouter.put("/categorias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);
      const { nome } = req.body;
      if (!nome) return res.status(400).json({ error: "Nome inválido." });

      const catRef = db.collection("categorias").doc(id);
      const doc = await catRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }
      const oldName = doc.data()?.nome || "";
      await catRef.update({ nome });

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Categoria Alterada: ${oldName} -> ${nome}`,
        valor_antigo: 0,
        valor_novo: 0,
        tipo: "Categoria",
        registro_id: idNum,
        categoria_id: idNum
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json({ id: idNum, nome });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao editar categoria" });
    }
  });

  apiRouter.delete("/categorias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);

      const despesasSnap = await db.collection("despesas").where("categoria_id", "==", idNum).limit(1).get();
      if (!despesasSnap.empty) {
        return res.status(400).json({ error: "Não é possível excluir uma categoria que possui despesas vinculadas" });
      }

      const catRef = db.collection("categorias").doc(id);
      const doc = await catRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Categoria não encontrada" });

      const oldName = doc.data()?.nome || "";
      await catRef.delete();

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Categoria Excluída: ${oldName}`,
        valor_antigo: 0,
        valor_novo: 0,
        tipo: "Categoria",
        registro_id: idNum,
        categoria_id: idNum
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao excluir categoria" });
    }
  });

  // Despesas Endpoints
  apiRouter.get("/despesas", async (req, res) => {
    try {
      const [despesasSnap, pessoasSnap, categoriasSnap] = await Promise.all([
        db.collection("despesas").get(),
        db.collection("pessoas").get(),
        db.collection("categorias").get()
      ]);
      const despesas = despesasSnap.docs.map(doc => doc.data());
      const pessoasList = pessoasSnap.docs.map(doc => doc.data());
      const categoriasList = categoriasSnap.docs.map(doc => doc.data());

      const pessoasMap = new Map<any, any>(pessoasList.map(p => [p.id, p]));
      const categoriasMap = new Map<any, any>(categoriasList.map(c => [c.id, c]));

      const list = despesas.map(d => ({
        ...d,
        origem_nome: pessoasMap.get(d.origem_id)?.nome || "-",
        categoria_nome: categoriasMap.get(d.categoria_id)?.nome || "-"
      }));

      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao buscar despesas" });
    }
  });

  apiRouter.post("/despesas", async (req, res) => {
    try {
      const { data_compra, data_pagamento, valor, descricao, origem_id, destino, categoria_id, ignoreDuplicates } = req.body;
      
      if (!data_compra || !data_pagamento || isNaN(Number(valor)) || !origem_id || !categoria_id) {
        return res.status(400).json({ error: "Dados incompletos ou inválidos (valor, origem ou categoria)." });
      }

      const roundedValor = Math.round(Number(valor) * 100) / 100;
      
      if (!ignoreDuplicates) {
        const snap = await db.collection("despesas").where("data_compra", "==", data_compra).get();
        const existing = snap.docs.find(doc => {
          const d = doc.data();
          return d.data_pagamento === data_pagamento &&
                 d.valor === roundedValor &&
                 d.descricao === (descricao || "") &&
                 d.origem_id === Number(origem_id) &&
                 d.destino === destino &&
                 d.categoria_id === Number(categoria_id);
        });
        if (existing) {
          return res.status(400).json({ error: "Esta despesa já foi lançada (duplicada)." });
        }
      }

      const nextId = await getNextId("despesas");
      const record = {
        id: nextId,
        data_compra,
        data_pagamento,
        valor: roundedValor,
        descricao: descricao || "",
        origem_id: Number(origem_id),
        destino,
        categoria_id: Number(categoria_id)
      };

      await db.collection("despesas").doc(nextId.toString()).set(record);

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Lançamento inicial: Saída S${nextId} - ${descricao || "Despesa"}`,
        valor_antigo: 0,
        valor_novo: roundedValor,
        tipo: "Despesa",
        registro_id: nextId,
        pessoa_id: Number(origem_id),
        data_registro: data_pagamento,
        destino,
        categoria_id: Number(categoria_id)
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json(record);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao criar despesa" });
    }
  });

  apiRouter.patch("/despesas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);
      const { valor, categoria_id } = req.body;

      let oldRecord: any = null;

      const doc = await db.collection("despesas").doc(id).get();
      if (doc.exists) {
        oldRecord = doc.data();
      }

      if (!oldRecord) return res.status(404).json({ error: "Despesa não encontrada" });

      const updates: any = {};

      if (valor !== undefined) {
        if (isNaN(Number(valor))) {
          return res.status(400).json({ error: "Valor inválido." });
        }
        const roundedValor = Math.round(Number(valor) * 100) / 100;
        updates.valor = roundedValor;

        const nextLogId = await getNextId("logs");
        const logRecord = {
          id: nextLogId,
          timestamp: new Date().toISOString(),
          descricao: `Alteração de valor: Saída S${id} - ${oldRecord.descricao || "Despesa"}`,
          valor_antigo: oldRecord.valor,
          valor_novo: roundedValor,
          tipo: "Despesa",
          registro_id: idNum,
          pessoa_id: oldRecord.origem_id
        };

        await db.collection("logs").doc(nextLogId.toString()).set(logRecord);
      }

      if (categoria_id !== undefined) {
        const catIdNum = Number(categoria_id);
        updates.categoria_id = catIdNum;

        let oldCatName = "Sem Categoria";
        let newCatName = "Sem Categoria";

        const [oldCatSnap, newCatSnap] = await Promise.all([
          db.collection("categorias").doc(oldRecord.categoria_id.toString()).get(),
          db.collection("categorias").doc(catIdNum.toString()).get()
        ]);
        if (oldCatSnap.exists) oldCatName = oldCatSnap.data()?.nome || "Sem Categoria";
        if (newCatSnap.exists) newCatName = newCatSnap.data()?.nome || "Sem Categoria";

        const nextLogId = await getNextId("logs");
        const logRecord = {
          id: nextLogId,
          timestamp: new Date().toISOString(),
          descricao: `Alteração de categoria: Saída S${id} - ${oldRecord.descricao || "Despesa"} (${oldCatName} -> ${newCatName})`,
          valor_antigo: 0,
          valor_novo: 0,
          tipo: "Despesa",
          registro_id: idNum,
          pessoa_id: oldRecord.origem_id
        };

        await db.collection("logs").doc(nextLogId.toString()).set(logRecord);
      }

      await db.collection("despesas").doc(id).update(updates);

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao atualizar despesa" });
    }
  });

  apiRouter.delete("/despesas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);

      let oldRecord: any = null;

      const doc = await db.collection("despesas").doc(id).get();
      if (doc.exists) {
        oldRecord = doc.data();
      }

      if (!oldRecord) return res.status(404).json({ error: "Despesa não encontrada" });

      await db.collection("despesas").doc(id).delete();

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Exclusão: Saída S${id} - ${oldRecord.descricao || "Despesa"}`,
        valor_antigo: oldRecord.valor,
        valor_novo: 0,
        tipo: "Despesa",
        registro_id: idNum,
        pessoa_id: oldRecord.origem_id
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao excluir despesa" });
    }
  });

  // Salarios (Entradas) Endpoints
  apiRouter.get("/salarios", async (req, res) => {
    try {
      const [salariosSnap, sheetsSnap] = await Promise.all([
        db.collection("salarios").get(),
        db.collection("pessoas").get()
      ]);
      const salarios = salariosSnap.docs.map(doc => doc.data());
      const pessoasList = sheetsSnap.docs.map(doc => doc.data());

      const pessoasMap = new Map<any, any>(pessoasList.map(p => [p.id, p]));

      const list = salarios.map(s => ({
        ...s,
        recebedor_nome: pessoasMap.get(s.recebedor_id)?.nome || "-"
      }));

      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao buscar salários" });
    }
  });

  apiRouter.post("/salarios", async (req, res) => {
    try {
      const { data_pagamento, valor, descricao, recebedor_id } = req.body;
      
      if (!data_pagamento || isNaN(Number(valor)) || !recebedor_id) {
        return res.status(400).json({ error: "Dados incompletos ou inválidos (valor ou recebedor)." });
      }

      const roundedValor = Math.round(Number(valor) * 100) / 100;

      // Duplicate check
      const snap = await db.collection("salarios").where("data_pagamento", "==", data_pagamento).get();
      const existing = snap.docs.find(doc => {
        const s = doc.data();
        return s.valor === roundedValor &&
               s.descricao === (descricao || "") &&
               s.recebedor_id === Number(recebedor_id);
      });
      if (existing) {
        return res.status(400).json({ error: "Este lançamento de entrada já existe (duplicado)." });
      }

      const nextId = await getNextId("salarios");
      const record = {
        id: nextId,
        data_pagamento,
        valor: roundedValor,
        descricao: descricao || "",
        recebedor_id: Number(recebedor_id)
      };

      await db.collection("salarios").doc(nextId.toString()).set(record);

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Lançamento inicial: Entrada E${nextId} - ${descricao || "Entrada"}`,
        valor_antigo: 0,
        valor_novo: roundedValor,
        tipo: "Entrada",
        registro_id: nextId,
        pessoa_id: Number(recebedor_id),
        data_registro: data_pagamento,
        destino: "Entrada"
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json(record);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao criar salário" });
    }
  });

  apiRouter.patch("/salarios/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);
      const { valor } = req.body;

      if (isNaN(Number(valor))) {
        return res.status(400).json({ error: "Valor inválido." });
      }

      const roundedValor = Math.round(Number(valor) * 100) / 100;

      let oldRecord: any = null;

      const doc = await db.collection("salarios").doc(id).get();
      if (doc.exists) {
        oldRecord = doc.data();
      }

      if (!oldRecord) return res.status(404).json({ error: "Entrada não encontrada" });

      await db.collection("salarios").doc(id).update({ valor: roundedValor });

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Alteração de valor: Entrada E${id} - ${oldRecord.descricao || "Entrada"}`,
        valor_antigo: oldRecord.valor,
        valor_novo: roundedValor,
        tipo: "Entrada",
        registro_id: idNum,
        pessoa_id: oldRecord.recebedor_id
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json({ success: true, valor: roundedValor });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao atualizar valor da entrada." });
    }
  });

  apiRouter.delete("/salarios/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);

      let oldRecord: any = null;

      const doc = await db.collection("salarios").doc(id).get();
      if (doc.exists) {
        oldRecord = doc.data();
      }

      if (!oldRecord) return res.status(404).json({ error: "Entrada não encontrada" });

      await db.collection("salarios").doc(id).delete();

      const nextLogId = await getNextId("logs");
      const logRecord = {
        id: nextLogId,
        timestamp: new Date().toISOString(),
        descricao: `Exclusão: Entrada E${id} - ${oldRecord.descricao || "Entrada"}`,
        valor_antigo: oldRecord.valor,
        valor_novo: 0,
        tipo: "Entrada",
        registro_id: idNum,
        pessoa_id: oldRecord.recebedor_id
      };

      await db.collection("logs").doc(nextLogId.toString()).set(logRecord);

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao excluir entrada" });
    }
  });

  // Logs Endpoint
  apiRouter.get("/logs", async (req, res) => {
    try {
      const [logsSnap, pessoasSnap, categoriasSnap] = await Promise.all([
        db.collection("logs").get(),
        db.collection("pessoas").get(),
        db.collection("categorias").get()
      ]);
      const logs = logsSnap.docs.map(doc => doc.data());
      const pessoasList = pessoasSnap.docs.map(doc => doc.data());
      const categoriasList = categoriasSnap.docs.map(doc => doc.data());

      const pessoasMap = new Map<any, any>(pessoasList.map(p => [p.id, p]));
      const categoriasMap = new Map<any, any>(categoriasList.map(c => [c.id, c]));

      const list = logs.map(l => ({
        ...l,
        pessoa_nome: l.pessoa_id ? (pessoasMap.get(l.pessoa_id)?.nome || "-") : "-",
        categoria_nome: l.categoria_id ? (categoriasMap.get(l.categoria_id)?.nome || "-") : "-"
      }));

      // Sort in memory by timestamp descending
      list.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));

      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao buscar logs" });
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
