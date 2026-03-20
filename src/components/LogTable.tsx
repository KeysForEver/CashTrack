import React from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/formatters';
import { Movement } from '../types';

interface LogTableProps {
  movements: Movement[];
  logSort: { key: keyof Movement; direction: 'asc' | 'desc' } | null;
  onSort: (key: keyof Movement) => void;
  onDelete: (id: string) => void;
}

export const LogTable = ({ movements, logSort, onSort, onDelete }: LogTableProps) => {
  const LogTableHeader = ({ label, columnKey }: { label: string, columnKey: keyof Movement }) => {
    const isSorted = logSort?.key === columnKey;
    
    return (
      <th 
        className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-200 transition-colors select-none group"
        onClick={() => onSort(columnKey)}
      >
        <div className="flex items-center gap-2">
          <span className="truncate">{label}</span>
          <div className="flex flex-col shrink-0">
            {isSorted ? (
              logSort.direction === 'asc' ? (
                <ChevronUp size={14} className="text-indigo-600" />
              ) : (
                <ChevronDown size={14} className="text-indigo-600" />
              )
            ) : (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronUp size={14} className="text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <LogTableHeader label="Data" columnKey="data" />
            <LogTableHeader label="Descrição" columnKey="descricao" />
            <LogTableHeader label="Categoria" columnKey="categoria" />
            <LogTableHeader label="Valor" columnKey="valor" />
            <LogTableHeader label="Tipo" columnKey="tipo" />
            <LogTableHeader label="Pessoa" columnKey="pessoa" />
            <LogTableHeader label="Destino" columnKey="destino" />
            <th className="px-4 py-3 font-semibold text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {movements.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
              <td className="px-4 py-3 text-gray-500 font-medium">{m.formattedDate}</td>
              <td className="px-4 py-3 text-gray-900 font-semibold">{m.descricao}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                  {m.categoria}
                </span>
              </td>
              <td className={cn("px-4 py-3 font-bold", m.tipo === 'Entrada' ? "text-emerald-600" : "text-rose-600")}>
                {m.tipo === 'Entrada' ? '+' : '-'} {formatCurrency(m.valor)}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  m.tipo === 'Entrada' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {m.tipo}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{m.pessoa}</td>
              <td className="px-4 py-3 text-gray-600">{m.destino}</td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onDelete(m.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                  title="Excluir Registro"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          {movements.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-gray-400 italic">
                Nenhum registro encontrado para os filtros selecionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
