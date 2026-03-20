import React, { useState } from 'react';

interface PessoaFormProps {
  onSubmit: (data: { nome: string; cor: string }) => Promise<void>;
}

export const PessoaForm = ({ onSubmit }: PessoaFormProps) => {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#6366f1');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({ nome, cor });
      setNome('');
      setCor('#6366f1');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Nome</label>
        <input 
          type="text" 
          placeholder="Nome da pessoa"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          required
        />
      </div>
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Cor</label>
        <input 
          type="color" 
          value={cor}
          onChange={e => setCor(e.target.value)}
          className="w-full h-12 rounded-xl border-gray-200 bg-gray-50 p-1 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
          required
        />
      </div>
      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? 'Salvando...' : 'Salvar Pessoa'}
      </button>
    </form>
  );
};
