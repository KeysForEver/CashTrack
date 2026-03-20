import { Pessoa, Categoria, Despesa, Salario } from '../types';

export const api = {
  fetchPessoas: (): Promise<Pessoa[]> => fetch('/api/pessoas').then(res => res.json()),
  fetchCategorias: (): Promise<Categoria[]> => fetch('/api/categorias').then(res => res.json()),
  fetchDespesas: (): Promise<Despesa[]> => fetch('/api/despesas').then(res => res.json()),
  fetchSalarios: (): Promise<Salario[]> => fetch('/api/salarios').then(res => res.json()),

  addPessoa: (pessoa: { nome: string; cor: string }) => 
    fetch('/api/pessoas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pessoa),
    }),

  deletePessoa: (id: number) => fetch(`/api/pessoas/${id}`, { method: 'DELETE' }),

  addDespesa: (despesa: any) => 
    fetch('/api/despesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(despesa),
    }),

  deleteDespesa: (id: number) => fetch(`/api/despesas/${id}`, { method: 'DELETE' }),

  addSalario: (salario: any) => 
    fetch('/api/salarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salario),
    }),

  deleteSalario: (id: number) => fetch(`/api/salarios/${id}`, { method: 'DELETE' }),

  addCategoria: (categoria: { nome: string }) => 
    fetch('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoria),
    }),

  restoreBackup: (file: File) => {
    const formData = new FormData();
    formData.append('backup', file);
    return fetch('/api/restore', {
      method: 'POST',
      body: formData,
    });
  }
};
