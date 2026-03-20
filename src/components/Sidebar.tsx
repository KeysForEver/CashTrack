import React from 'react';
import { 
  Plus, Users, DollarSign, CreditCard, Tag, Download, Upload, RotateCcw, ClipboardCheck, Search, TrendingUp
} from 'lucide-react';
import { SidebarButton } from './SidebarButton';

interface SidebarProps {
  onAddPessoa: () => void;
  onAddDespesa: () => void;
  onAddSalario: () => void;
  onAddCategoria: () => void;
  onImport: () => void;
  onLog: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onAddPessoa,
  onAddDespesa,
  onAddSalario,
  onAddCategoria,
  onImport,
  onLog
}) => {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-8 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <DollarSign className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">CASH TRACK</h1>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        <section>
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Lançamentos</h2>
          <div className="space-y-2">
            <SidebarButton 
              onClick={onAddDespesa} 
              icon={<CreditCard className="w-5 h-5" />} 
              label="Nova Saída" 
              color="text-rose-600 bg-rose-50/50" 
              hoverBg="hover:bg-rose-50"
            />
            <SidebarButton 
              onClick={onAddSalario} 
              icon={<TrendingUp className="w-5 h-5" />} 
              label="Nova Entrada" 
              color="text-emerald-600 bg-emerald-50/50" 
              hoverBg="hover:bg-emerald-50"
            />
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Configurações</h2>
          <div className="space-y-2">
            <SidebarButton 
              onClick={onAddPessoa} 
              icon={<Users className="w-5 h-5" />} 
              label="Pessoas" 
              color="text-gray-600" 
              hoverBg="hover:bg-gray-50"
            />
            <SidebarButton 
              onClick={onAddCategoria} 
              icon={<Tag className="w-5 h-5" />} 
              label="Categorias" 
              color="text-gray-600" 
              hoverBg="hover:bg-gray-50"
            />
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Dados & Logs</h2>
          <div className="space-y-2">
            <SidebarButton 
              onClick={onLog} 
              icon={<ClipboardCheck className="w-5 h-5" />} 
              label="Log de Atividades" 
              color="text-indigo-600 bg-indigo-50/50" 
              hoverBg="hover:bg-indigo-50"
            />
            <SidebarButton 
              onClick={onImport} 
              icon={<Upload className="w-5 h-5" />} 
              label="Importar / Backup" 
              color="text-gray-600" 
              hoverBg="hover:bg-gray-50"
            />
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-gray-100">
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Status do Sistema</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gray-600">Online & Sincronizado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
