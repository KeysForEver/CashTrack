import { useState, useEffect, useCallback } from 'react';
import { Pessoa, Categoria, Despesa, Salario } from '../types';
import { api } from '../services/api';

export function useData() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [salarios, setSalarios] = useState<Salario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Carregando dados...');
    try {
      const [p, c, d, s] = await Promise.all([
        api.fetchPessoas(),
        api.fetchCategorias(),
        api.fetchDespesas(),
        api.fetchSalarios(),
      ]);
      setPessoas(p);
      setCategorias(c);
      setDespesas(d);
      setSalarios(s);
    } catch (err) {
      setError('Erro ao carregar dados do servidor. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addPessoa = async (pessoa: { nome: string; cor: string }) => {
    const res = await api.addPessoa(pessoa);
    if (!res.ok) throw new Error('Falha ao salvar pessoa');
    await fetchData();
  };

  const deletePessoa = async (id: number) => {
    const res = await api.deletePessoa(id);
    if (!res.ok) throw new Error('Falha ao excluir pessoa');
    await fetchData();
  };

  const addDespesa = async (despesa: any) => {
    const res = await api.addDespesa(despesa);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao salvar despesa');
    }
    await fetchData();
  };

  const deleteDespesa = async (id: number) => {
    const res = await api.deleteDespesa(id);
    if (!res.ok) throw new Error('Falha ao excluir despesa');
    await fetchData();
  };

  const addSalario = async (salario: any) => {
    const res = await api.addSalario(salario);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao salvar salário');
    }
    await fetchData();
  };

  const deleteSalario = async (id: number) => {
    const res = await api.deleteSalario(id);
    if (!res.ok) throw new Error('Falha ao excluir salário');
    await fetchData();
  };

  const addCategoria = async (categoria: { nome: string }) => {
    const res = await api.addCategoria(categoria);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao salvar categoria');
    }
    await fetchData();
  };

  const restoreData = async (file: File) => {
    const res = await api.restoreBackup(file);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao restaurar dados');
    }
    await fetchData();
  };

  return {
    pessoas,
    categorias,
    despesas,
    salarios,
    isLoading,
    loadingMessage,
    error,
    setError,
    fetchData,
    addPessoa,
    deletePessoa,
    addDespesa,
    deleteDespesa,
    addSalario,
    deleteSalario,
    addCategoria,
    restoreData,
    setCategorias,
    setIsLoading,
    setLoadingMessage
  };
}
