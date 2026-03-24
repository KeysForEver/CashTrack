import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export const exportPersonData = async (details: any) => {
  if (!details) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Movimentações');

  worksheet.columns = [
    { header: 'Data', key: 'Data', width: 15 },
    { header: 'Descrição', key: 'Descrição', width: 30 },
    { header: 'Categoria', key: 'Categoria', width: 20 },
    { header: 'Valor', key: 'Valor', width: 15 },
    { header: 'Tipo', key: 'Tipo', width: 15 },
    { header: 'Destino', key: 'Destino', width: 20 },
  ];

  details.movements.forEach((m: any) => {
    worksheet.addRow({
      'Data': m.formattedDate,
      'Descrição': m.descricao,
      'Categoria': m.categoria_nome || m.categoria || '-',
      'Valor': m.valor,
      'Tipo': m.tipo,
      'Destino': m.destino === 'Dividir' ? 'Dividido' : (m.destino_nome || m.destino || '-')
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Resumo_${details.person.nome}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  saveAs(new Blob([buffer]), fileName);
};

export const exportLogData = async (movements: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Log de Atividades');

  worksheet.columns = [
    { header: 'Data', key: 'Data', width: 15 },
    { header: 'Descrição', key: 'Descrição', width: 30 },
    { header: 'Categoria', key: 'Categoria', width: 20 },
    { header: 'Valor', key: 'Valor', width: 15 },
    { header: 'Tipo', key: 'Tipo', width: 15 },
    { header: 'Pessoa', key: 'Pessoa', width: 20 },
    { header: 'Destino', key: 'Destino', width: 20 },
  ];

  movements.forEach((m: any) => {
    worksheet.addRow({
      'Data': m.formattedDate,
      'Descrição': m.descricao,
      'Categoria': m.categoria,
      'Valor': m.valor,
      'Tipo': m.tipo,
      'Pessoa': m.pessoa,
      'Destino': m.destino
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Log_CashTrack_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  saveAs(new Blob([buffer]), fileName);
};
