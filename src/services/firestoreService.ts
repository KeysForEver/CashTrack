import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Pessoa, Categoria, Despesa, Salario } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Atomically get next incremental ID
export async function getNextId(counterKey: string): Promise<number> {
  const counterRef = doc(db, 'metadata', 'counters');
  try {
    const result = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let current = 0;
      if (counterDoc.exists()) {
        const data = counterDoc.data();
        current = Number(data[counterKey]) || 0;
      }
      const next = current + 1;
      transaction.set(counterRef, { [counterKey]: next }, { merge: true });
      return next;
    });
    return result;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'metadata/counters');
    throw err;
  }
}

// Logging helper
export async function addLog(logData: {
  descricao: string;
  valor_antigo?: number | null;
  valor_novo?: number | null;
  tipo: string;
  registro_id: number;
  pessoa_id?: number | null;
  data_registro?: string | null;
  destino?: string | null;
  categoria_id?: number | null;
}) {
  try {
    const nextLogId = await getNextId('logs');
    const logRecord = {
      id: nextLogId,
      timestamp: new Date().toISOString(),
      descricao: logData.descricao,
      valor_antigo: logData.valor_antigo !== undefined && logData.valor_antigo !== null ? Number(logData.valor_antigo) : 0,
      valor_novo: logData.valor_novo !== undefined && logData.valor_novo !== null ? Number(logData.valor_novo) : 0,
      tipo: logData.tipo,
      registro_id: logData.registro_id,
      pessoa_id: logData.pessoa_id !== undefined ? logData.pessoa_id : null,
      data_registro: logData.data_registro || null,
      destino: logData.destino || null,
      categoria_id: logData.categoria_id !== undefined ? logData.categoria_id : null
    };

    const docRef = doc(db, 'logs', nextLogId.toString());
    await setDoc(docRef, logRecord);
    return logRecord;
  } catch (err) {
    console.error('Error adding log:', err);
    // Do not fail main action if logging fails
    return null;
  }
}

// ==================== PESSOAS ====================
export async function getPessoas(): Promise<Pessoa[]> {
  try {
    const snap = await getDocs(collection(db, 'pessoas'));
    const list: Pessoa[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: Number(data.id || docSnap.id),
        nome: String(data.nome || ''),
        cor: String(data.cor || '#264653')
      });
    });
    return list.sort((a, b) => a.id - b.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'pessoas');
    return [];
  }
}

export async function addPessoa(data: { nome: string; cor: string }): Promise<Pessoa> {
  try {
    const nextId = await getNextId('pessoas');
    const newPerson: Pessoa = {
      id: nextId,
      nome: data.nome.trim(),
      cor: data.cor.trim()
    };
    await setDoc(doc(db, 'pessoas', nextId.toString()), newPerson);

    await addLog({
      descricao: `Nova Pessoa: ${newPerson.nome}`,
      valor_antigo: 0,
      valor_novo: 0,
      tipo: 'Pessoa',
      registro_id: nextId,
      pessoa_id: nextId
    });

    return newPerson;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'pessoas');
    throw err;
  }
}

export async function deletePessoa(id: number): Promise<void> {
  try {
    const despesasSnap = await getDocs(query(collection(db, 'despesas'), where('origem_id', '==', id)));
    const salariosSnap = await getDocs(query(collection(db, 'salarios'), where('recebedor_id', '==', id)));

    const batch = writeBatch(db);
    despesasSnap.forEach(d => batch.delete(d.ref));
    salariosSnap.forEach(s => batch.delete(s.ref));
    batch.delete(doc(db, 'pessoas', id.toString()));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `pessoas/${id}`);
    throw err;
  }
}

// ==================== CATEGORIAS ====================
export async function getCategorias(): Promise<Categoria[]> {
  try {
    const snap = await getDocs(collection(db, 'categorias'));
    const list: Categoria[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: Number(data.id || docSnap.id),
        nome: String(data.nome || '')
      });
    });
    return list.sort((a, b) => a.id - b.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'categorias');
    return [];
  }
}

export async function addCategoria(data: { nome: string }): Promise<Categoria> {
  try {
    const cleanNome = data.nome.trim();
    // Check if exists
    const q = query(collection(db, 'categorias'), where('nome', '==', cleanNome));
    const existing = await getDocs(q);
    if (!existing.empty) {
      const d = existing.docs[0].data();
      return { id: Number(d.id || existing.docs[0].id), nome: d.nome };
    }

    const nextId = await getNextId('categorias');
    const newCat: Categoria = {
      id: nextId,
      nome: cleanNome
    };
    await setDoc(doc(db, 'categorias', nextId.toString()), newCat);

    await addLog({
      descricao: `Nova Categoria: ${newCat.nome}`,
      valor_antigo: 0,
      valor_novo: 0,
      tipo: 'Categoria',
      registro_id: nextId,
      categoria_id: nextId
    });

    return newCat;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'categorias');
    throw err;
  }
}

export async function updateCategoria(id: number, nome: string): Promise<Categoria> {
  try {
    const catRef = doc(db, 'categorias', id.toString());
    const docSnap = await getDoc(catRef);
    const oldName = docSnap.exists() ? docSnap.data().nome : '';

    await updateDoc(catRef, { nome: nome.trim() });

    await addLog({
      descricao: `Categoria Alterada: ${oldName} -> ${nome.trim()}`,
      valor_antigo: 0,
      valor_novo: 0,
      tipo: 'Categoria',
      registro_id: id,
      categoria_id: id
    });

    return { id, nome: nome.trim() };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `categorias/${id}`);
    throw err;
  }
}

export async function deleteCategoria(id: number): Promise<void> {
  try {
    const despesasSnap = await getDocs(query(collection(db, 'despesas'), where('categoria_id', '==', id)));
    if (!despesasSnap.empty) {
      throw new Error('Não é possível excluir esta categoria pois existem despesas vinculadas a ela.');
    }
    await deleteDoc(doc(db, 'categorias', id.toString()));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categorias/${id}`);
    throw err;
  }
}

// ==================== DESPESAS ====================
export async function getDespesas(): Promise<Despesa[]> {
  try {
    const snap = await getDocs(collection(db, 'despesas'));
    const list: Despesa[] = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      list.push({
        id: Number(d.id || docSnap.id),
        data_compra: String(d.data_compra || d.data_pagamento || ''),
        data_pagamento: String(d.data_pagamento || ''),
        valor: Number(d.valor || 0),
        descricao: String(d.descricao || ''),
        origem_id: Number(d.origem_id || 0),
        destino: String(d.destino || 'Dividir'),
        categoria_id: Number(d.categoria_id || 0),
        observacao: String(d.observacao || '')
      });
    });
    return list.sort((a, b) => b.id - a.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'despesas');
    return [];
  }
}

export async function addDespesa(data: {
  data_compra: string;
  data_pagamento: string;
  valor: number;
  descricao: string;
  origem_id: number;
  destino: string;
  categoria_id: number;
  observacao?: string;
  ignoreDuplicates?: boolean;
}): Promise<Despesa> {
  try {
    const nextId = await getNextId('despesas');
    const newDespesa: Despesa = {
      id: nextId,
      data_compra: data.data_compra,
      data_pagamento: data.data_pagamento,
      valor: Number(data.valor),
      descricao: data.descricao || '',
      origem_id: Number(data.origem_id),
      destino: data.destino || 'Dividir',
      categoria_id: Number(data.categoria_id),
      observacao: data.observacao ? data.observacao.trim() : ''
    };

    await setDoc(doc(db, 'despesas', nextId.toString()), newDespesa);

    await addLog({
      descricao: `Lançamento inicial: ${newDespesa.descricao || 'Despesa'}`,
      valor_antigo: 0,
      valor_novo: newDespesa.valor,
      tipo: 'Despesa',
      registro_id: nextId,
      pessoa_id: newDespesa.origem_id,
      data_registro: newDespesa.data_pagamento,
      destino: newDespesa.destino,
      categoria_id: newDespesa.categoria_id
    });

    return newDespesa;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'despesas');
    throw err;
  }
}

export async function updateDespesa(id: number, partial: Partial<Despesa>): Promise<void> {
  try {
    const despesaRef = doc(db, 'despesas', id.toString());
    const snap = await getDoc(despesaRef);
    if (!snap.exists()) {
      throw new Error('Despesa não encontrada');
    }
    const current = snap.data();

    await updateDoc(despesaRef, partial as any);

    if (partial.valor !== undefined && partial.valor !== current.valor) {
      await addLog({
        descricao: `Valor alterado: ${current.descricao || 'Despesa'}`,
        valor_antigo: Number(current.valor),
        valor_novo: Number(partial.valor),
        tipo: 'Despesa',
        registro_id: id,
        pessoa_id: Number(current.origem_id),
        data_registro: current.data_pagamento,
        destino: current.destino,
        categoria_id: Number(current.categoria_id)
      });
    }

    if (partial.categoria_id !== undefined && partial.categoria_id !== current.categoria_id) {
      await addLog({
        descricao: `Categoria alterada na despesa: ${current.descricao || 'Despesa'}`,
        valor_antigo: Number(current.valor),
        valor_novo: Number(current.valor),
        tipo: 'Despesa',
        registro_id: id,
        pessoa_id: Number(current.origem_id),
        data_registro: current.data_pagamento,
        destino: current.destino,
        categoria_id: Number(partial.categoria_id)
      });
    }

    if (partial.observacao !== undefined && partial.observacao !== current.observacao) {
      await addLog({
        descricao: `Nota/Observação alterada na despesa: ${current.descricao || 'Despesa'}`,
        valor_antigo: Number(current.valor),
        valor_novo: Number(current.valor),
        tipo: 'Despesa',
        registro_id: id,
        pessoa_id: Number(current.origem_id),
        data_registro: current.data_pagamento,
        destino: current.destino,
        categoria_id: Number(current.categoria_id)
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `despesas/${id}`);
    throw err;
  }
}

export async function deleteDespesa(id: number): Promise<void> {
  try {
    const despesaRef = doc(db, 'despesas', id.toString());
    const snap = await getDoc(despesaRef);
    if (snap.exists()) {
      const current = snap.data();
      await addLog({
        descricao: `Exclusão: ${current.descricao || 'Despesa'}`,
        valor_antigo: Number(current.valor),
        valor_novo: 0,
        tipo: 'Despesa',
        registro_id: id,
        pessoa_id: Number(current.origem_id),
        data_registro: current.data_pagamento,
        destino: current.destino,
        categoria_id: Number(current.categoria_id)
      });
    }
    await deleteDoc(despesaRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `despesas/${id}`);
    throw err;
  }
}

// ==================== SALARIOS ====================
export async function getSalarios(): Promise<Salario[]> {
  try {
    const snap = await getDocs(collection(db, 'salarios'));
    const list: Salario[] = [];
    snap.forEach(docSnap => {
      const s = docSnap.data();
      list.push({
        id: Number(s.id || docSnap.id),
        data_pagamento: String(s.data_pagamento || ''),
        valor: Number(s.valor || 0),
        descricao: String(s.descricao || ''),
        recebedor_id: Number(s.recebedor_id || 0)
      });
    });
    return list.sort((a, b) => b.id - a.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'salarios');
    return [];
  }
}

export async function addSalario(data: {
  data_pagamento: string;
  valor: number;
  descricao: string;
  recebedor_id: number;
}): Promise<Salario> {
  try {
    const nextId = await getNextId('salarios');
    const newSalario: Salario = {
      id: nextId,
      data_pagamento: data.data_pagamento,
      valor: Number(data.valor),
      descricao: data.descricao || '',
      recebedor_id: Number(data.recebedor_id)
    };

    await setDoc(doc(db, 'salarios', nextId.toString()), newSalario);

    await addLog({
      descricao: `Lançamento inicial: ${newSalario.descricao || 'Entrada'}`,
      valor_antigo: 0,
      valor_novo: newSalario.valor,
      tipo: 'Salário',
      registro_id: nextId,
      pessoa_id: newSalario.recebedor_id,
      data_registro: newSalario.data_pagamento
    });

    return newSalario;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'salarios');
    throw err;
  }
}

export async function updateSalario(id: number, partial: Partial<Salario>): Promise<void> {
  try {
    const salarioRef = doc(db, 'salarios', id.toString());
    const snap = await getDoc(salarioRef);
    if (!snap.exists()) {
      throw new Error('Entrada não encontrada');
    }
    const current = snap.data();

    await updateDoc(salarioRef, partial as any);

    if (partial.valor !== undefined && partial.valor !== current.valor) {
      await addLog({
        descricao: `Valor alterado: ${current.descricao || 'Entrada'}`,
        valor_antigo: Number(current.valor),
        valor_novo: Number(partial.valor),
        tipo: 'Salário',
        registro_id: id,
        pessoa_id: Number(current.recebedor_id),
        data_registro: current.data_pagamento
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `salarios/${id}`);
    throw err;
  }
}

export async function deleteSalario(id: number): Promise<void> {
  try {
    const salarioRef = doc(db, 'salarios', id.toString());
    const snap = await getDoc(salarioRef);
    if (snap.exists()) {
      const current = snap.data();
      await addLog({
        descricao: `Exclusão: ${current.descricao || 'Entrada'}`,
        valor_antigo: Number(current.valor),
        valor_novo: 0,
        tipo: 'Salário',
        registro_id: id,
        pessoa_id: Number(current.recebedor_id),
        data_registro: current.data_pagamento
      });
    }
    await deleteDoc(salarioRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `salarios/${id}`);
    throw err;
  }
}

// ==================== LOGS ====================
export async function getLogs(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'logs'));
    const list: any[] = [];
    snap.forEach(docSnap => {
      const l = docSnap.data();
      list.push({
        id: Number(l.id || docSnap.id),
        timestamp: String(l.timestamp || new Date().toISOString()),
        descricao: String(l.descricao || ''),
        valor_antigo: l.valor_antigo !== undefined && l.valor_antigo !== null ? Number(l.valor_antigo) : 0,
        valor_novo: l.valor_novo !== undefined && l.valor_novo !== null ? Number(l.valor_novo) : 0,
        tipo: String(l.tipo || ''),
        registro_id: Number(l.registro_id || 0),
        pessoa_id: l.pessoa_id !== undefined && l.pessoa_id !== null ? Number(l.pessoa_id) : null,
        data_registro: l.data_registro || null,
        destino: l.destino || null,
        categoria_id: l.categoria_id !== undefined && l.categoria_id !== null ? Number(l.categoria_id) : null
      });
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'logs');
    return [];
  }
}

// ==================== RESET & BACKUP ====================
async function deleteCollectionDocs(colName: string) {
  const snap = await getDocs(collection(db, colName));
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function resetAllData(): Promise<void> {
  try {
    await Promise.all([
      deleteCollectionDocs('pessoas'),
      deleteCollectionDocs('categorias'),
      deleteCollectionDocs('despesas'),
      deleteCollectionDocs('salarios'),
      deleteCollectionDocs('logs')
    ]);

    await setDoc(doc(db, 'metadata', 'counters'), {
      pessoas: 0,
      categorias: 0,
      despesas: 0,
      salarios: 0,
      logs: 0
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'all');
    throw err;
  }
}

export async function getBackupData(): Promise<any> {
  try {
    const [p, c, d, s, l] = await Promise.all([
      getPessoas(),
      getCategorias(),
      getDespesas(),
      getSalarios(),
      getLogs()
    ]);
    return {
      pessoas: p,
      categorias: c,
      despesas: d,
      salarios: s,
      logs: l,
      exportedAt: new Date().toISOString()
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'backup');
    throw err;
  }
}

export async function restoreBackupData(backupData: any): Promise<void> {
  try {
    await resetAllData();

    let maxP = 0, maxC = 0, maxD = 0, maxS = 0, maxL = 0;

    if (Array.isArray(backupData.pessoas)) {
      const batch = writeBatch(db);
      backupData.pessoas.forEach((p: any) => {
        const id = Number(p.id);
        if (id > maxP) maxP = id;
        batch.set(doc(db, 'pessoas', id.toString()), { id, nome: p.nome, cor: p.cor });
      });
      await batch.commit();
    }

    if (Array.isArray(backupData.categorias)) {
      const batch = writeBatch(db);
      backupData.categorias.forEach((c: any) => {
        const id = Number(c.id);
        if (id > maxC) maxC = id;
        batch.set(doc(db, 'categorias', id.toString()), { id, nome: c.nome });
      });
      await batch.commit();
    }

    if (Array.isArray(backupData.despesas)) {
      const batch = writeBatch(db);
      backupData.despesas.forEach((d: any) => {
        const id = Number(d.id);
        if (id > maxD) maxD = id;
        batch.set(doc(db, 'despesas', id.toString()), {
          id,
          data_compra: d.data_compra || d.data_pagamento,
          data_pagamento: d.data_pagamento,
          valor: Number(d.valor),
          descricao: d.descricao || '',
          origem_id: Number(d.origem_id),
          destino: d.destino || 'Dividir',
          categoria_id: Number(d.categoria_id),
          observacao: d.observacao || ''
        });
      });
      await batch.commit();
    }

    if (Array.isArray(backupData.salarios)) {
      const batch = writeBatch(db);
      backupData.salarios.forEach((s: any) => {
        const id = Number(s.id);
        if (id > maxS) maxS = id;
        batch.set(doc(db, 'salarios', id.toString()), {
          id,
          data_pagamento: s.data_pagamento,
          valor: Number(s.valor),
          descricao: s.descricao || '',
          recebedor_id: Number(s.recebedor_id)
        });
      });
      await batch.commit();
    }

    if (Array.isArray(backupData.logs)) {
      const batch = writeBatch(db);
      backupData.logs.forEach((l: any) => {
        const id = Number(l.id);
        if (id > maxL) maxL = id;
        batch.set(doc(db, 'logs', id.toString()), {
          id,
          timestamp: l.timestamp || new Date().toISOString(),
          descricao: l.descricao || '',
          valor_antigo: l.valor_antigo !== undefined ? Number(l.valor_antigo) : 0,
          valor_novo: l.valor_novo !== undefined ? Number(l.valor_novo) : 0,
          tipo: l.tipo || '',
          registro_id: Number(l.registro_id || 0),
          pessoa_id: l.pessoa_id !== undefined ? Number(l.pessoa_id) : null,
          data_registro: l.data_registro || null,
          destino: l.destino || null,
          categoria_id: l.categoria_id !== undefined ? Number(l.categoria_id) : null
        });
      });
      await batch.commit();
    }

    await setDoc(doc(db, 'metadata', 'counters'), {
      pessoas: maxP,
      categorias: maxC,
      despesas: maxD,
      salarios: maxS,
      logs: maxL
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'restore');
    throw err;
  }
}
