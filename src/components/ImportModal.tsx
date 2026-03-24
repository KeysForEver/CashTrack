import React, { useState } from 'react';
import { Upload, RotateCcw, ClipboardCheck } from 'lucide-react';
import { Modal } from './Modal';
import { PROMPT_CONTA_CORRENTE, PROMPT_CARTAO_CREDITO } from '../constants/prompts';
import { Pessoa, Categoria } from '../types';
import { parseCSV } from '../utils/csv';
import { copyToClipboard as copyToClipboardUtil } from '../utils/clipboard';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pessoas: Pessoa[];
  categorias: Categoria[];
  onReview: (items: any[]) => void;
  onRestore: (file: File) => void;
}

export const ImportModal = ({ isOpen, onClose, pessoas, categorias, onReview, onRestore }: ImportModalProps) => {
  const [importPessoaId, setImportPessoaId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyPrompt = async (text: string, message: string) => {
    const success = await copyToClipboardUtil(text);
    if (success) {
      showToast(message);
    } else {
      alert('Não foi possível copiar o texto automaticamente. Por favor, tente selecionar e copiar manualmente.');
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importPessoaId) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const rawItems = parseCSV(text);
      
      const processedItems = rawItems.map(item => {
        const valorStr = item.Valor.replace('.', '').replace(',', '.');
        const valor = parseFloat(valorStr);
        
        // Try to match category
        const categoria = categorias.find(c => c.nome.toLowerCase() === item.Categoria.toLowerCase());
        
        return {
          ...item,
          Valor: valor,
          origem_id: parseInt(importPessoaId),
          destino: 'Dividir',
          categoria_id: categoria?.id || categorias.find(c => c.nome === 'Outros')?.id || (categorias.length > 0 ? categorias[0].id : 0)
        };
      });

      onReview(processedItems);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar arquivo CSV.');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Dados">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-indigo-50 p-5 border border-indigo-100 space-y-4">
            <div className="flex items-center gap-3 text-indigo-700">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Importar CSV</h3>
                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">IA / Extratos</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1.5">Pessoa Origem</label>
                <select 
                  value={importPessoaId}
                  onChange={e => setImportPessoaId(e.target.value)}
                  className="w-full rounded-xl border-indigo-200 bg-white py-2.5 px-4 text-sm font-semibold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">Selecione...</option>
                  {pessoas.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv"
                  id="csv-upload"
                  className="hidden"
                  onChange={handleImportCSV}
                  disabled={!importPessoaId || isLoading}
                />
                <label 
                  htmlFor="csv-upload"
                  className={`flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl py-3 text-sm font-bold text-white transition-all shadow-lg active:scale-95 ${
                    !importPessoaId || isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  {isLoading ? <RotateCcw className="animate-spin" size={18} /> : <Upload size={18} />}
                  Selecionar CSV
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-100 space-y-4">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Restaurar Backup</h3>
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">JSON / Completo</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-medium text-emerald-600 leading-relaxed">Restaure o banco de dados completo a partir de um arquivo JSON exportado anteriormente.</p>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json"
                  id="json-restore"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onRestore(file);
                    e.target.value = '';
                  }}
                />
                <label 
                  htmlFor="json-restore"
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                >
                  <RotateCcw size={18} />
                  Restaurar JSON
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-600 rounded-full" />
            Prompts para IA (PDF → CSV)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleCopyPrompt(PROMPT_CONTA_CORRENTE, 'Prompt Conta Corrente copiado!')}
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                  <ClipboardCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">Extrato Bancário</p>
                  <p className="text-[10px] font-medium text-gray-400">PDF → CSV</p>
                </div>
              </div>
              <div className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">COPIAR</div>
            </button>
            <button
              onClick={() => handleCopyPrompt(PROMPT_CARTAO_CREDITO, 'Prompt Cartão de Crédito copiado!')}
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                  <ClipboardCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">Fatura Cartão</p>
                  <p className="text-[10px] font-medium text-gray-400">PDF → CSV</p>
                </div>
              </div>
              <div className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">COPIAR</div>
            </button>
          </div>
        </div>
      </div>
      
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xl z-[200]">
          {toast}
        </div>
      )}
    </Modal>
  );
};
