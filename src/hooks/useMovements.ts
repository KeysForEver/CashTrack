import { useMemo, useState } from 'react';
import { parseISO, getMonth, getYear, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeString } from '../utils/formatters';
import { Movement, Pessoa, Categoria, Despesa, Salario } from '../types';

export function useMovements(
  despesas: Despesa[],
  salarios: Salario[],
  pessoas: Pessoa[],
  categorias: Categoria[]
) {
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logSort, setLogSort] = useState<{ key: keyof Movement; direction: 'asc' | 'desc' } | null>(null);

  const allMovements = useMemo(() => {
    const mDespesas = despesas.map(d => {
      let destinoLabel = d.destino;
      if (d.destino !== 'Dividir') {
        const p = pessoas.find(p => p.id.toString() === d.destino);
        destinoLabel = p ? p.nome : d.destino;
      }
      const dateObj = parseISO(d.data);
      const valid = isValid(dateObj);
      
      return {
        id: `d-${d.id}`,
        data: d.data,
        dateObj,
        isValidDate: valid,
        formattedDate: valid ? format(dateObj, 'dd/MM/yyyy') : d.data,
        month: valid ? getMonth(dateObj) + 1 : 0,
        monthName: valid ? format(dateObj, 'MMMM', { locale: ptBR }) : '',
        monthNameShort: valid ? format(dateObj, 'MMM', { locale: ptBR }) : '',
        year: valid ? getYear(dateObj).toString() : '',
        descricao: d.descricao || 'Despesa',
        categoria: d.categoria_nome || '-',
        valor: d.valor,
        tipo: 'Saída' as const,
        pessoa: d.origem_nome || '-',
        destino: destinoLabel,
        raw: d
      };
    });

    const mSalarios = salarios.map(s => {
      const dateObj = parseISO(s.data);
      const valid = isValid(dateObj);
      
      return {
        id: `s-${s.id}`,
        data: s.data,
        dateObj,
        isValidDate: valid,
        formattedDate: valid ? format(dateObj, 'dd/MM/yyyy') : s.data,
        month: valid ? getMonth(dateObj) + 1 : 0,
        monthName: valid ? format(dateObj, 'MMMM', { locale: ptBR }) : '',
        monthNameShort: valid ? format(dateObj, 'MMM', { locale: ptBR }) : '',
        year: valid ? getYear(dateObj).toString() : '',
        descricao: s.descricao || 'Salário',
        categoria: 'Salário',
        valor: s.valor,
        tipo: 'Entrada' as const,
        pessoa: '-',
        destino: s.recebedor_nome || '-',
        raw: s
      };
    });

    return [...mDespesas, ...mSalarios];
  }, [despesas, salarios, pessoas]);

  const filteredMovements = useMemo(() => {
    let result = [...allMovements];

    if (logSearchTerm) {
      const term = normalizeString(logSearchTerm).trim();
      
      result = result.filter(m => {
        return (
          m.data.includes(term) ||
          m.formattedDate.includes(term) ||
          normalizeString(m.monthName).includes(term) ||
          normalizeString(m.monthNameShort).includes(term) ||
          normalizeString(m.descricao).includes(term) ||
          normalizeString(m.categoria).includes(term) ||
          m.valor.toString().includes(term) ||
          normalizeString(m.tipo).includes(term) ||
          normalizeString(m.pessoa).includes(term) ||
          normalizeString(m.destino).includes(term)
        );
      });
    }

    if (logSort) {
      result.sort((a, b) => {
        const valA = a[logSort.key];
        const valB = b[logSort.key];
        
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        
        return logSort.direction === 'asc' ? comparison : -comparison;
      });
    } else {
      result.sort((a, b) => {
        if (!a.isValidDate) return 1;
        if (!b.isValidDate) return -1;
        return b.dateObj.getTime() - a.dateObj.getTime();
      });
    }

    return result;
  }, [allMovements, logSearchTerm, logSort]);

  const handleSort = (key: keyof Movement) => {
    setLogSort((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  return {
    logSearchTerm,
    setLogSearchTerm,
    logSort,
    setLogSort,
    filteredMovements,
    handleSort
  };
}
