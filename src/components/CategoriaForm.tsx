import React, { useState } from 'react';

interface CategoriaFormProps {
  onSubmit: (data: { nome: string }) => Promise<void>;
}

export const CategoriaForm = ({ onSubmit }: CategoriaFormProps) => {
  const [nome, setNome] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({ nome });
      setNome('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Nome da Categoria</label>
        <input 
          type="text" 
          placeholder="Ex: Alimentação, Lazer..."
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          required
        />
      </div>
      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? 'Salvando...' : 'Salvar Categoria'}
      </button>
    </form>
  );
};
