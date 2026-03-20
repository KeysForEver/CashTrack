import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pessoa, Categoria, Despesa, Salario, PALETTES } from '../types';

export function useDashboardData(
  despesas: Despesa[],
  salarios: Salario[],
  pessoas: Pessoa[],
  categorias: Categoria[],
  filterMonth: number,
  filterYear: number
) {
  const filteredDespesas = useMemo(() => {
    return despesas.filter((d) => {
      const date = new Date(d.data);
      const m = date.getMonth();
      const y = date.getFullYear();
      return (filterMonth === -1 || m === filterMonth) && (filterYear === -1 || y === filterYear);
    });
  }, [despesas, filterMonth, filterYear]);

  const filteredSalarios = useMemo(() => {
    return salarios.filter((s) => {
      const date = new Date(s.data);
      const m = date.getMonth();
      const y = date.getFullYear();
      return (filterMonth === -1 || m === filterMonth) && (filterYear === -1 || y === filterYear);
    });
  }, [salarios, filterMonth, filterYear]);

  const totalSpent = useMemo(() => filteredDespesas.reduce((acc, d) => acc + d.valor, 0), [filteredDespesas]);
  const totalSalary = useMemo(() => filteredSalarios.reduce((acc, s) => acc + s.valor, 0), [filteredSalarios]);
  const balance = useMemo(() => totalSalary - totalSpent, [totalSalary, totalSpent]);

  const barData = useMemo(() => {
    if (filterMonth !== -1 && filterYear !== -1) {
      const start = startOfMonth(new Date(filterYear, filterMonth));
      const end = endOfMonth(start);
      const days = eachDayOfInterval({ start, end });

      return days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const daySpent = filteredDespesas
          .filter((d) => d.data === dateStr)
          .reduce((acc, d) => acc + d.valor, 0);
        const daySalary = filteredSalarios
          .filter((s) => s.data === dateStr)
          .reduce((acc, s) => acc + s.valor, 0);

        return {
          name: format(day, 'dd'),
          'Saídas': daySpent,
          'Entradas': daySalary,
        };
      });
    }

    // Default: Group by month
    const months = Array.from({ length: 12 }, (_, i) => i);
    return months.map((m) => {
      const monthSpent = filteredDespesas
        .filter((d) => new Date(d.data).getMonth() === m)
        .reduce((acc, d) => acc + d.valor, 0);
      const monthSalary = filteredSalarios
        .filter((s) => new Date(s.data).getMonth() === m)
        .reduce((acc, s) => acc + s.valor, 0);

      return {
        name: format(new Date(2000, m), 'MMM', { locale: ptBR }),
        'Saídas': monthSpent,
        'Entradas': monthSalary,
      };
    });
  }, [filteredDespesas, filteredSalarios, filterMonth, filterYear]);

  const pieData = useMemo(() => {
    const categoryTotals = categorias.map((c) => {
      const total = filteredDespesas
        .filter((d) => d.categoria_id === c.id)
        .reduce((acc, d) => acc + d.valor, 0);
      return { name: c.nome, value: total };
    }).filter((c) => c.value > 0);

    const palette = PALETTES[0].colors;
    return categoryTotals.map((c, i) => ({
      ...c,
      color: palette[i % palette.length],
    }));
  }, [filteredDespesas, categorias]);

  const personStats = useMemo(() => {
    return pessoas.map((p) => {
      const pSalarios = filteredSalarios.filter((s) => s.recebedor_id === p.id);
      const pDespesas = filteredDespesas.filter((d) => d.origem_id === p.id);
      
      const totalSalary = pSalarios.reduce((acc, s) => acc + s.valor, 0);
      const exclusiveSpent = pDespesas.filter(d => d.destino === p.id.toString()).reduce((acc, d) => acc + d.valor, 0);
      const sharedSpent = pDespesas.filter(d => d.destino === 'Dividir').reduce((acc, d) => acc + d.valor, 0);
      
      // Also include shared expenses from others
      const othersSharedSpent = filteredDespesas
        .filter(d => d.origem_id !== p.id && d.destino === 'Dividir')
        .reduce((acc, d) => acc + (d.valor / pessoas.length), 0);

      const totalSpent = exclusiveSpent + sharedSpent + othersSharedSpent;

      return {
        person: p,
        totalSalary,
        exclusiveSpent,
        sharedSpent,
        othersSharedSpent,
        totalSpent,
        net: totalSalary - totalSpent,
      };
    });
  }, [pessoas, filteredDespesas, filteredSalarios]);

  return {
    totalSpent,
    totalSalary,
    balance,
    barData,
    pieData,
    personStats,
  };
}
