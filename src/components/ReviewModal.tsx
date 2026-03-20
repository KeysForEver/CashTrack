import React, { useState } from 'react';
import { Search, X, Check, Trash2, RotateCcw } from 'lucide-react';
import { Modal } from './Modal';
import { cn } from '../utils/cn';
import { normalizeString, formatCurrency } from '../utils/formatters';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onConfirm: (items: any[]) => Promise<void>;
}

export const ReviewModal = ({ isOpen, onClose, items: initialItems, onConfirm }: ReviewModalProps) => {
  const [items, setItems] = useState<any[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync items when initialItems change
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const term = normalizeString(searchTerm);
    return (
      normalizeString(item.Data || '').includes(term) ||
      normalizeString(item.Descrição || '').includes(term) ||
      normalizeString(item.Categoria || '').includes(term) ||
      item.Valor?.toString().includes(term) ||
      normalizeString(item.Tipo || '').includes(term)
    );
  });

  const updateItem = (index: number, field: string, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(items);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Revisar Importação" className="max-w-4xl">
      <div className="space-y-4">
        <div className="flex items-center gap-4 sticky top-[-24px] z-20 bg-white pb-4 pt-2 -mx-6 px-6 border-b border-gray-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar itens para revisão..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-gray-200 bg-gray-50 py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{items.length} itens</span>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                <RotateCcw size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-3">
            {filteredItems.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3 group hover:bg-white transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={item.Data}
                      onChange={e => updateItem(idx, 'Data', e.target.value)}
                      className="w-24 text-xs font-bold text-gray-500 bg-transparent border-none p-0 focus:ring-0"
                    />
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      item.Tipo === 'Entrada' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {item.Tipo}
                    </span>
                  </div>
                  <button onClick={() => removeItem(idx)} className="p-1.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Descrição</label>
                    <input 
                      type="text" 
                      value={item.Descrição}
                      onChange={e => updateItem(idx, 'Descrição', e.target.value)}
                      className="w-full text-sm font-semibold text-gray-900 bg-white rounded-lg border-gray-200 py-1.5 px-3 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Valor</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.Valor}
                      onChange={e => updateItem(idx, 'Valor', parseFloat(e.target.value))}
                      className="w-full text-sm font-bold text-gray-900 bg-white rounded-lg border-gray-200 py-1.5 px-3 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Categoria</label>
                  <input 
                    type="text" 
                    value={item.Categoria}
                    onChange={e => updateItem(idx, 'Categoria', e.target.value)}
                    className="w-full text-sm font-medium text-gray-600 bg-white rounded-lg border-gray-200 py-1.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-gray-400">Nenhum item encontrado para revisão.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-50">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || items.length === 0}
            className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {isLoading ? <RotateCcw className="animate-spin" size={18} /> : <Check size={18} />}
            Confirmar Importação ({items.length})
          </button>
        </div>
      </div>
    </Modal>
  );
};
