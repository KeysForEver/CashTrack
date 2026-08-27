import React, { useState, useEffect } from 'react';
import { 
  X, Download, FileText, Table as TableIcon, CheckCircle2, 
  Circle, Calendar, Layers, Filter, Clock 
} from 'lucide-react';
import { format } from 'date-fns';

export interface ExportColumn {
  id: string;
  label: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  filename: string;
  columns: string[];
  useDateFilter: boolean;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  title?: string;
  defaultFilenamePrefix: string;
  availableColumns?: ExportColumn[];
  dateFilterDescription?: string;
  hasActiveDateFilter?: boolean;
  filteredCount?: number;
  totalCount?: number;
}

const DEFAULT_COLUMNS: ExportColumn[] = [
  { id: 'date', label: 'Data Pagamento' },
  { id: 'date_compra', label: 'Data Compra' },
  { id: 'description', label: 'Descrição' },
  { id: 'category', label: 'Categoria' },
  { id: 'destino', label: 'Destino' },
  { id: 'observacao', label: 'Observação' },
  { id: 'value', label: 'Valor' },
  { id: 'type', label: 'Tipo' },
];

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  title = "Exportar Dados",
  defaultFilenamePrefix,
  availableColumns = DEFAULT_COLUMNS,
  dateFilterDescription = "Todo o histórico",
  hasActiveDateFilter = false,
  filteredCount,
  totalCount
}) => {
  const [formatType, setFormatType] = useState<'csv' | 'xlsx'>('xlsx');
  const [filename, setFilename] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(availableColumns.map(c => c.id));
  const [useDateFilter, setUseDateFilter] = useState<boolean>(hasActiveDateFilter);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      setFilename(`${defaultFilenamePrefix}_${dateStr}`);
      setSelectedColumns(availableColumns.map(c => c.id));
      setUseDateFilter(hasActiveDateFilter);
    }
  }, [isOpen, defaultFilenamePrefix, availableColumns, hasActiveDateFilter]);

  if (!isOpen) return null;

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    onExport({
      format: formatType,
      filename: filename || defaultFilenamePrefix,
      columns: selectedColumns,
      useDateFilter: useDateFilter,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Download size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 tracking-tight">{title}</h2>
              <p className="text-xs text-gray-500">Configure as opções para gerar o arquivo</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Format Selection */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Formato do Arquivo</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormatType('xlsx')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                  formatType === 'xlsx' 
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-600'
                }`}
              >
                <TableIcon size={22} className={formatType === 'xlsx' ? 'text-indigo-600' : 'text-gray-400'} />
                <div>
                  <p className="font-bold text-sm">Excel (.xlsx)</p>
                  <p className="text-[11px] opacity-75">Planilha formatada</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormatType('csv')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                  formatType === 'csv' 
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-600'
                }`}
              >
                <FileText size={22} className={formatType === 'csv' ? 'text-indigo-600' : 'text-gray-400'} />
                <div>
                  <p className="font-bold text-sm">CSV (.csv)</p>
                  <p className="text-[11px] opacity-75">Texto simples</p>
                </div>
              </button>
            </div>
          </section>

          {/* Date Filter Selection */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-500" />
                Intervalo de Datas dos Dados
              </h3>
              {hasActiveDateFilter && (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Filtro Global Ativo
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Option 1: Global Date Filter Range */}
              <button
                type="button"
                onClick={() => setUseDateFilter(true)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                  useDateFilter 
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50/50'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  useDateFilter ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Filter size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-gray-800">Usar Filtro Global de Datas</p>
                    {filteredCount !== undefined && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        useDateFilter ? 'bg-indigo-200/80 text-indigo-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {filteredCount} {filteredCount === 1 ? 'item' : 'itens'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-indigo-600/90 mt-0.5 truncate">
                    {dateFilterDescription}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Exporta apenas os lançamentos compreendidos no período atualmente ativo no painel.
                  </p>
                </div>
              </button>

              {/* Option 2: All Historical Data */}
              <button
                type="button"
                onClick={() => setUseDateFilter(false)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                  !useDateFilter 
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50/50'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  !useDateFilter ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Layers size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-gray-800">Todo o Histórico Completo</p>
                    {totalCount !== undefined && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        !useDateFilter ? 'bg-indigo-200/80 text-indigo-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {totalCount} {totalCount === 1 ? 'item' : 'itens'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sem filtro de data (ignora o período selecionado no cabeçalho)
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Exporta todas as movimentações já registradas no banco de dados.
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* Filename */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nome do Arquivo</h3>
            <div className="relative">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none pr-14 text-sm font-medium text-gray-800"
                placeholder="Ex: Resumo_Joao_2026"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                .{formatType}
              </span>
            </div>
          </section>

          {/* Column Selection */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Colunas para Incluir</h3>
              <button
                type="button"
                onClick={() => {
                  if (selectedColumns.length === availableColumns.length) {
                    setSelectedColumns([]);
                  } else {
                    setSelectedColumns(availableColumns.map(c => c.id));
                  }
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {selectedColumns.length === availableColumns.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableColumns.map((col) => (
                <button
                  type="button"
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                    selectedColumns.includes(col.id)
                      ? 'border-indigo-200 bg-indigo-50/50 text-indigo-800 font-semibold'
                      : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{col.label}</span>
                  {selectedColumns.includes(col.id) ? (
                    <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                  ) : (
                    <Circle size={16} className="text-gray-300 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/60 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedColumns.length === 0}
            className="flex-1 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Baixar Arquivo
          </button>
        </div>
      </div>
    </div>
  );
};
