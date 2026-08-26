import React, { useState, useMemo } from 'react';
import { 
  Search, X, Filter, Download, RotateCcw, Clock, ShieldCheck, 
  ArrowRight, AlertCircle, PlusCircle, Edit3, Trash2, Tag, Users, 
  DollarSign, CreditCard, Sparkles, CheckCircle2, ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Modal } from './Modal';
import { Pessoa, Categoria } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface AuditLog {
  id: number;
  timestamp: string;
  descricao: string;
  valor_antigo: number;
  valor_novo: number;
  tipo: string;
  registro_id: number;
  pessoa_id?: number | null;
  data_registro?: string | null;
  destino?: string | null;
  categoria_id?: number | null;
}

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  pessoas: Pessoa[];
  categorias: Categoria[];
  formatCurrency: (val: number) => string;
}

type OperationFilterType = 'all' | 'create' | 'update_value' | 'update_other' | 'delete' | 'despesa' | 'salario' | 'pessoa_categoria';

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  pessoas,
  categorias,
  formatCurrency
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<OperationFilterType>('all');

  // Helper map for fast lookup of person and category names
  const pessoaMap = useMemo(() => {
    const map = new Map<number, string>();
    pessoas.forEach(p => map.set(Number(p.id), p.nome));
    return map;
  }, [pessoas]);

  const categoriaMap = useMemo(() => {
    const map = new Map<number, string>();
    categorias.forEach(c => map.set(Number(c.id), c.nome));
    return map;
  }, [categorias]);

  // Enrich logs with category, person, and operation category
  const enrichedLogs = useMemo(() => {
    return auditLogs.map(log => {
      const desc = log.descricao || '';
      let opType: 'create' | 'update_value' | 'update_other' | 'delete' | 'other' = 'other';

      if (desc.startsWith('Lançamento inicial:') || desc.startsWith('Nova Pessoa:') || desc.startsWith('Nova Categoria:')) {
        opType = 'create';
      } else if (desc.startsWith('Exclusão:')) {
        opType = 'delete';
      } else if (desc.startsWith('Valor alterado:') || (log.valor_antigo !== log.valor_novo && log.valor_antigo > 0 && log.valor_novo > 0)) {
        opType = 'update_value';
      } else if (desc.includes('alterada') || desc.includes('Alterada') || desc.includes('Nota/Observação')) {
        opType = 'update_other';
      }

      let personName = '-';
      if (log.pessoa_id && pessoaMap.has(Number(log.pessoa_id))) {
        personName = pessoaMap.get(Number(log.pessoa_id))!;
      } else if (log.tipo === 'Pessoa') {
        personName = desc.replace('Nova Pessoa: ', '');
      }

      let destinoLabel = log.destino || '-';
      if (log.destino && log.destino !== 'Dividir' && !isNaN(Number(log.destino))) {
        const destPerson = pessoaMap.get(Number(log.destino));
        if (destPerson) destinoLabel = destPerson;
      }

      let categoryName = '-';
      if (log.categoria_id && categoriaMap.has(Number(log.categoria_id))) {
        categoryName = categoriaMap.get(Number(log.categoria_id))!;
      }

      let dateFormatted = '';
      let timeFormatted = '';
      try {
        const d = parseISO(log.timestamp);
        if (!isNaN(d.getTime())) {
          dateFormatted = format(d, 'dd/MM/yyyy', { locale: ptBR });
          timeFormatted = format(d, 'HH:mm:ss');
        }
      } catch {
        dateFormatted = log.timestamp;
      }

      return {
        ...log,
        opType,
        personName,
        destinoLabel,
        categoryName,
        dateFormatted,
        timeFormatted,
        cleanDesc: desc
      };
    });
  }, [auditLogs, pessoaMap, categoriaMap]);

  // Filtered logs based on search term and category tabs
  const filteredLogs = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const term = normalize(searchTerm).trim();
    const numericTerm = term.replace(',', '.');

    return enrichedLogs.filter(log => {
      // 1. Filter by active category tab
      if (activeFilter === 'create' && log.opType !== 'create') return false;
      if (activeFilter === 'update_value' && log.opType !== 'update_value') return false;
      if (activeFilter === 'update_other' && log.opType !== 'update_other') return false;
      if (activeFilter === 'delete' && log.opType !== 'delete') return false;
      if (activeFilter === 'despesa' && log.tipo !== 'Despesa') return false;
      if (activeFilter === 'salario' && log.tipo !== 'Salário' && log.tipo !== 'Entrada') return false;
      if (activeFilter === 'pessoa_categoria' && log.tipo !== 'Pessoa' && log.tipo !== 'Categoria') return false;

      // 2. Filter by search term
      if (!term) return true;

      const descNorm = normalize(log.cleanDesc);
      const tipoNorm = normalize(log.tipo);
      const personNorm = normalize(log.personName);
      const destNorm = normalize(log.destinoLabel);
      const catNorm = normalize(log.categoryName);
      const dateNorm = log.dateFormatted;
      const timeNorm = log.timeFormatted;
      const idStr = log.registro_id?.toString() || '';
      const vAntigoStr = log.valor_antigo?.toString() || '';
      const vNovoStr = log.valor_novo?.toString() || '';
      const vAntigoFmt = formatCurrency(log.valor_antigo || 0).toLowerCase();
      const vNovoFmt = formatCurrency(log.valor_novo || 0).toLowerCase();

      // Check operation keywords
      const opKeywords = [
        log.opType === 'create' ? 'criacao lancamento novo nova inicial cadastro' : '',
        log.opType === 'update_value' ? 'alteracao valor mudanca editar' : '',
        log.opType === 'update_other' ? 'alteracao categoria observacao nota editar' : '',
        log.opType === 'delete' ? 'exclusao deletar remover apagado' : '',
      ].join(' ');

      return (
        descNorm.includes(term) ||
        tipoNorm.includes(term) ||
        personNorm.includes(term) ||
        destNorm.includes(term) ||
        catNorm.includes(term) ||
        dateNorm.includes(term) ||
        timeNorm.includes(term) ||
        idStr.includes(term) ||
        vAntigoStr.includes(term) ||
        vAntigoStr.includes(numericTerm) ||
        vNovoStr.includes(term) ||
        vNovoStr.includes(numericTerm) ||
        vAntigoFmt.includes(term) ||
        vNovoFmt.includes(term) ||
        opKeywords.includes(term)
      );
    });
  }, [enrichedLogs, searchTerm, activeFilter, formatCurrency]);

  const handleExportLogs = async (fileType: 'xlsx' | 'csv') => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Auditoria_Logs');

    worksheet.columns = [
      { header: 'Data', key: 'date', width: 14 },
      { header: 'Hora', key: 'time', width: 12 },
      { header: 'Tipo / Entidade', key: 'type', width: 16 },
      { header: 'Descrição da Ação', key: 'description', width: 45 },
      { header: 'Valor Anterior', key: 'old_value', width: 16 },
      { header: 'Valor Novo', key: 'new_value', width: 16 },
      { header: 'Pessoa', key: 'person', width: 20 },
      { header: 'Destino', key: 'destination', width: 20 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'ID Registro', key: 'ref_id', width: 12 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };

    filteredLogs.forEach(log => {
      worksheet.addRow({
        date: log.dateFormatted,
        time: log.timeFormatted,
        type: log.tipo,
        description: log.cleanDesc,
        old_value: log.valor_antigo || 0,
        new_value: log.valor_novo || 0,
        person: log.personName !== '-' ? log.personName : '',
        destination: log.destinoLabel !== '-' ? log.destinoLabel : '',
        category: log.categoryName !== '-' ? log.categoryName : '',
        ref_id: log.registro_id ? `#${log.registro_id}` : ''
      });
    });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
    const filename = `Auditoria_Logs_${timestamp}`;

    if (fileType === 'xlsx') {
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${filename}.xlsx`);
    } else {
      const buffer = await workbook.csv.writeBuffer();
      saveAs(new Blob([buffer]), `${filename}.csv`);
    }
  };

  const filterTabs = [
    { id: 'all', label: 'Todos os Logs', count: enrichedLogs.length },
    { id: 'despesa', label: 'Despesas', count: enrichedLogs.filter(l => l.tipo === 'Despesa').length },
    { id: 'salario', label: 'Entradas', count: enrichedLogs.filter(l => l.tipo === 'Salário' || l.tipo === 'Entrada').length },
    { id: 'update_value', label: 'Alterações de Valor', count: enrichedLogs.filter(l => l.opType === 'update_value').length },
    { id: 'update_other', label: 'Edições (Cat/Nota)', count: enrichedLogs.filter(l => l.opType === 'update_other').length },
    { id: 'delete', label: 'Exclusões', count: enrichedLogs.filter(l => l.opType === 'delete').length },
    { id: 'pessoa_categoria', label: 'Pessoas & Categorias', count: enrichedLogs.filter(l => l.tipo === 'Pessoa' || l.tipo === 'Categoria').length },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auditoria de Logs & Rastreabilidade"
      className="w-[92%] h-[90%] sm:w-[92%] sm:h-[90%] max-w-7xl"
    >
      <div className="flex flex-col h-full space-y-4">
        {/* Top Controls: Search Bar & Actions */}
        <div className="sticky top-[-24px] z-20 bg-white/95 backdrop-blur-sm pb-3 pt-1 -mx-6 px-6 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                size={18}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por descrição, tipo de operação, valor (ex: 50 ou R$ 50,00), pessoa, categoria..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-10 pr-24 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
              
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 transition-all"
                    title="Limpar busca"
                  >
                    <X size={15} />
                  </button>
                )}
                <span className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                  filteredLogs.length > 0 ? "bg-indigo-100 text-indigo-700" : "bg-rose-100 text-rose-700"
                )}>
                  {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}
                </span>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleExportLogs('xlsx')}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:shadow-xs transition-all active:scale-95"
                title="Exportar logs filtrados para planilha Excel (.xlsx)"
              >
                <Download size={14} />
                Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExportLogs('csv')}
                className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 border border-gray-200 hover:bg-gray-100 transition-all active:scale-95"
                title="Exportar logs filtrados para arquivo CSV"
              >
                <Download size={14} />
                CSV
              </button>
            </div>
          </div>

          {/* Filter Pills / Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider pl-1 pr-1 flex items-center gap-1">
              <Filter size={12} />
              Filtrar por:
            </span>
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as OperationFilterType)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs font-semibold scale-102"
                      : "bg-gray-100/90 text-gray-600 hover:bg-gray-200/90 hover:text-gray-900"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                  )}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Logs Table / Feed */}
        <div className="flex-1 overflow-auto rounded-xl border border-gray-100 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-600 bg-gray-50/90 sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Data / Hora</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Entidade</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Operação / Descrição</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Valores Envolvidos</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Pessoa / Origem</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Destino / Categoria</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isValueChange = log.opType === 'update_value';
                  const isDelete = log.opType === 'delete';
                  const isCreate = log.opType === 'create';
                  const isOtherEdit = log.opType === 'update_other';

                  return (
                    <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                      {/* Date & Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-xs">{log.dateFormatted}</span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Clock size={10} />
                            {log.timeFormatted}
                          </span>
                        </div>
                      </td>

                      {/* Entity / Tipo Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                          log.tipo === 'Despesa' && "bg-rose-50 text-rose-700 border-rose-200/80",
                          (log.tipo === 'Salário' || log.tipo === 'Entrada') && "bg-emerald-50 text-emerald-700 border-emerald-200/80",
                          log.tipo === 'Pessoa' && "bg-blue-50 text-blue-700 border-blue-200/80",
                          log.tipo === 'Categoria' && "bg-amber-50 text-amber-700 border-amber-200/80",
                          !['Despesa', 'Salário', 'Entrada', 'Pessoa', 'Categoria'].includes(log.tipo) && "bg-gray-50 text-gray-700 border-gray-200"
                        )}>
                          {log.tipo === 'Despesa' && <CreditCard size={12} />}
                          {(log.tipo === 'Salário' || log.tipo === 'Entrada') && <DollarSign size={12} />}
                          {log.tipo === 'Pessoa' && <Users size={12} />}
                          {log.tipo === 'Categoria' && <Tag size={12} />}
                          {log.tipo}
                        </span>
                      </td>

                      {/* Operation Description */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isCreate && (
                            <span className="p-1 rounded-md bg-emerald-100 text-emerald-700 shrink-0" title="Criação">
                              <PlusCircle size={14} />
                            </span>
                          )}
                          {isValueChange && (
                            <span className="p-1 rounded-md bg-amber-100 text-amber-700 shrink-0" title="Alteração de Valor">
                              <Edit3 size={14} />
                            </span>
                          )}
                          {isOtherEdit && (
                            <span className="p-1 rounded-md bg-indigo-100 text-indigo-700 shrink-0" title="Edição de Dados">
                              <Edit3 size={14} />
                            </span>
                          )}
                          {isDelete && (
                            <span className="p-1 rounded-md bg-rose-100 text-rose-700 shrink-0" title="Exclusão">
                              <Trash2 size={14} />
                            </span>
                          )}
                          <span className={cn(
                            "font-medium text-gray-800",
                            isDelete && "text-rose-700 line-through opacity-80"
                          )}>
                            {log.cleanDesc}
                          </span>
                        </div>
                      </td>

                      {/* Values Involved */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isValueChange ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span className="text-gray-400 line-through">{formatCurrency(log.valor_antigo)}</span>
                            <ArrowRight size={12} className="text-amber-500" />
                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                              {formatCurrency(log.valor_novo)}
                            </span>
                          </div>
                        ) : isDelete ? (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-rose-600 font-semibold">{formatCurrency(log.valor_antigo)}</span>
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-medium">Excluído</span>
                          </div>
                        ) : log.valor_novo > 0 ? (
                          <span className={cn(
                            "font-semibold text-xs",
                            log.tipo === 'Despesa' ? "text-rose-600" : "text-emerald-600"
                          )}>
                            {formatCurrency(log.valor_novo)}
                          </span>
                        ) : log.valor_antigo > 0 ? (
                          <span className="text-gray-600 font-medium text-xs">
                            {formatCurrency(log.valor_antigo)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs italic">-</span>
                        )}
                      </td>

                      {/* Person */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.personName !== '-' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100/80 px-2 py-0.5 rounded-md">
                            <Users size={11} className="text-indigo-500" />
                            {log.personName}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Destination / Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {log.categoryName !== '-' && (
                            <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                              <Tag size={10} className="text-amber-500" />
                              {log.categoryName}
                            </span>
                          )}
                          {log.destinoLabel !== '-' && (
                            <span className="text-[11px] text-gray-500">
                              Destino: <strong>{log.destinoLabel}</strong>
                            </span>
                          )}
                          {log.categoryName === '-' && log.destinoLabel === '-' && (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </div>
                      </td>

                      {/* ID */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                          #{log.registro_id}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck size={36} className="text-gray-300 stroke-[1.5]" />
                      <p className="text-base font-semibold text-gray-600">Nenhum registro de log encontrado</p>
                      <p className="text-xs text-gray-400 max-w-md">
                        {searchTerm
                          ? `Nenhum resultado corresponde aos termos da pesquisa "${searchTerm}". Tente pesquisar por outros valores, nomes ou datas.`
                          : 'Ainda não há registros de auditoria gravados no banco de dados.'}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setActiveFilter('all');
                          }}
                          className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Limpar busca e filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Todos os registros de auditoria são sincronizados em tempo real com o banco de dados.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-6 py-2 text-gray-700 font-semibold hover:bg-gray-200 transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
