import React, { useState } from 'react';
import { format } from 'date-fns';
import { Pessoa, Categoria } from '../types';

interface MovementFormProps {
  type: 'despesa' | 'salario';
  pessoas: Pessoa[];
  categorias: Categoria[];
  onSubmit: (data: any) => Promise<void>;
}

export const MovementForm = ({ type, pessoas, categorias, onSubmit }: MovementFormProps) => {
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origem_id, setOrigemId] = useState('');
  const [destino, setDestino] = useState('Dividir');
  const [categoria_id, setCategoriaId] = useState('');
  const [recebedor_id, setRecebedorId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (type === 'despesa') {
        await onSubmit({ data, valor: parseFloat(valor), descricao, origem_id: parseInt(origem_id), destino, categoria_id: parseInt(categoria_id) });
      } else {
        await onSubmit({ data, valor: parseFloat(valor), descricao, recebedor_id: parseInt(recebedor_id) });
      }
      setValor('');
      setDescricao('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Data</label>
          <input 
            type="date" 
            value={data}
            onChange={e => setData(e.target.value)}
            className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Valor</label>
          <input 
            type="number" 
            step="0.01"
            placeholder="0,00"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Descrição</label>
        <input 
          type="text" 
          placeholder="Ex: Aluguel, Supermercado..."
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          required
        />
      </div>

      {type === 'despesa' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Origem (Quem Pagou)</label>
              <select 
                value={origem_id}
                onChange={e => setOrigemId(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              >
                <option value="">Selecione...</option>
                {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Destino</label>
              <select 
                value={destino}
                onChange={e => setDestino(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              >
                <option value="Dividir">Dividir</option>
                {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Categoria</label>
            <select 
              value={categoria_id}
              onChange={e => setCategoriaId(e.target.value)}
              className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            >
              <option value="">Selecione...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </>
      ) : (
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Recebedor</label>
          <select 
            value={recebedor_id}
            onChange={e => setRecebedorId(e.target.value)}
            className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          >
            <option value="">Selecione...</option>
            {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      )}

      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? 'Salvando...' : `Salvar ${type === 'despesa' ? 'Saída' : 'Entrada'}`}
      </button>
    </form>
  );
};
