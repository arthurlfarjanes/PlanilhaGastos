export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    value = 0;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};
