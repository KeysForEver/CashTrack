import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatCurrency } from './formatters';

export const exportPersonData = (details: any) => {
  if (!details) return;

  const data = details.movements.map((m: any) => ({
    'Data': m.formattedDate,
    'Descrição': m.descricao,
    'Categoria': m.categoria_nome || m.categoria || '-',
    'Valor': m.valor,
    'Tipo': m.tipo,
    'Destino': m.destino === 'Dividir' ? 'Dividido' : (m.destino_nome || m.destino || '-')
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');

  const fileName = `Resumo_${details.person.nome}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportLogData = (movements: any[]) => {
  const data = movements.map((m: any) => ({
    'Data': m.formattedDate,
    'Descrição': m.descricao,
    'Categoria': m.categoria,
    'Valor': m.valor,
    'Tipo': m.tipo,
    'Pessoa': m.pessoa,
    'Destino': m.destino
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Log de Atividades');

  const fileName = `Log_CashTrack_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
