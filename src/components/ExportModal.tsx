import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Table as TableIcon, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';

interface ExportColumn {
  id: string;
  label: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  title?: string;
  defaultFilenamePrefix: string;
  availableColumns?: ExportColumn[];
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  filename: string;
  columns: string[];
}

const DEFAULT_COLUMNS: ExportColumn[] = [
  { id: 'date', label: 'Data' },
  { id: 'description', label: 'Descrição' },
  { id: 'category', label: 'Categoria' },
  { id: 'value', label: 'Valor' },
  { id: 'type', label: 'Tipo' },
];

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  title = "Exportar Dados",
  defaultFilenamePrefix,
  availableColumns = DEFAULT_COLUMNS
}) => {
  const [formatType, setFormatType] = useState<'csv' | 'xlsx'>('xlsx');
  const [filename, setFilename] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(availableColumns.map(c => c.id));

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
    }
  }, [isOpen, defaultFilenamePrefix, availableColumns]);

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
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Download size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Format Selection */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Formato do Arquivo</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormatType('xlsx')}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  formatType === 'xlsx' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-500'
                }`}
              >
                <TableIcon size={24} />
                <div className="text-left">
                  <p className="font-bold">Excel (.xlsx)</p>
                  <p className="text-xs opacity-70">Planilha formatada</p>
                </div>
              </button>
              <button
                onClick={() => setFormatType('csv')}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  formatType === 'csv' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-500'
                }`}
              >
                <FileText size={24} />
                <div className="text-left">
                  <p className="font-bold">CSV (.csv)</p>
                  <p className="text-xs opacity-70">Texto simples</p>
                </div>
              </button>
            </div>
          </section>

          {/* Filename */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Nome do Arquivo</h3>
            <div className="relative">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none pr-12 font-medium"
                placeholder="Ex: Resumo_Joao_2024"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                .{formatType}
              </span>
            </div>
          </section>

          {/* Column Selection */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Colunas para Incluir</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableColumns.map((col) => (
                <button
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selectedColumns.includes(col.id)
                      ? 'border-indigo-100 bg-indigo-50/50 text-indigo-700'
                      : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{col.label}</span>
                  {selectedColumns.includes(col.id) ? (
                    <CheckCircle2 size={20} className="text-indigo-600" />
                  ) : (
                    <Circle size={20} className="text-gray-200" />
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-50 bg-gray-50/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-white transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={selectedColumns.length === 0}
            className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Baixar Arquivo
          </button>
        </div>
      </div>
    </div>
  );
};
