// Datas chegam em UTC; exibição sempre em America/Fortaleza.
const formatoLongo = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: 'America/Fortaleza',
});

export function formatarData(data: Date): string {
  return formatoLongo.format(data);
}

/** Converte Date para valor de `<input type="date">` (YYYY-MM-DD, fuso local). */
export function paraInputData(data: Date | null | undefined): string {
  if (!data) return '';
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
