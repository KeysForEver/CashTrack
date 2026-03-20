export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const normalizeString = (s: string) => 
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
