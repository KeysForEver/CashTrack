import React from 'react';
import { Download, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Modal } from './Modal';
import { StatCard } from './StatCard';
import { formatCurrency } from '../utils/formatters';
import { cn } from '../utils/cn';

interface PersonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: any;
  onExport: () => void;
  onDeletePerson: (person: any) => void;
}

export const PersonDetailModal = ({ isOpen, onClose, details, onExport, onDeletePerson }: PersonDetailModalProps) => {
  if (!details) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Resumo: ${details.person.nome}`}>
      <div className="space-y-6">
        <div className="flex justify-end items-center gap-2">
          <button
            onClick={onExport}
            className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95 shadow-sm"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => onDeletePerson(details.person)}
            className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-all active:scale-95 shadow-sm"
            title="Excluir Pessoa e Registros"
          >
            <Trash2 size={18} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard 
            label="Entradas"
            value={formatCurrency(details.totalSalary)}
            colorClass="bg-emerald-50 border-emerald-100"
            labelClass="text-emerald-600"
            valueClass="text-emerald-700"
            icon={<TrendingUp size={16} className="text-emerald-400" />}
          />
          <div className="rounded-xl bg-rose-50 p-4 border border-rose-100 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Saídas (Total)</p>
              <TrendingDown size={16} className="text-rose-400" />
            </div>
            <div className="flex items-center mt-auto">
              <div className="flex-1 text-center">
                <p className="text-xl font-bold text-rose-700">{formatCurrency(details.totalSpent)}</p>
              </div>
              <div className="flex flex-col justify-center border-l border-rose-200 pl-3 ml-2 shrink-0 text-right">
                <div className="mb-1">
                  <p className="text-[9px] font-bold text-rose-400 uppercase leading-none">Próprias</p>
                  <p className="text-[11px] font-bold text-rose-600">{formatCurrency(details.exclusiveSpent)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-rose-400 uppercase leading-none">Divididas</p>
                  <p className="text-[11px] font-bold text-rose-600">{formatCurrency(details.sharedSpent)}</p>
                </div>
              </div>
            </div>
          </div>
          <StatCard 
            label="Saldo Líquido"
            value={formatCurrency(details.net)}
            colorClass={details.net >= 0 ? "bg-blue-50 border-blue-100" : "bg-amber-50 border-amber-100"}
            labelClass={details.net >= 0 ? "text-blue-600" : "text-amber-600"}
            valueClass={details.net >= 0 ? "text-blue-700" : "text-amber-700"}
            icon={<DollarSign size={16} className={details.net >= 0 ? "text-blue-400" : "text-amber-400"} />}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-4 bg-indigo-600 rounded-full" />
            Movimentações Recentes
          </h3>
          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-2">
              {details.movements.map((m: any, idx: number) => (
                <div key={`${m.id}-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      m.tipo === 'Entrada' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {m.tipo === 'Entrada' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{m.descricao}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{m.formattedDate} • {m.categoria_nome || m.categoria || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-black",
                      m.tipo === 'Entrada' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {m.tipo === 'Entrada' ? '+' : '-'} {formatCurrency(m.valor)}
                    </p>
                    {m.destino === 'Dividir' && (
                      <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded">Dividido</span>
                    )}
                  </div>
                </div>
              ))}
              {details.movements.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-gray-400">Nenhuma movimentação encontrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
