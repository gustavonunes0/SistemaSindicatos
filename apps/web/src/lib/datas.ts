// Datas chegam em UTC; exibição sempre em America/Fortaleza.
const formatoLongo = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: 'America/Fortaleza',
});

export function formatarData(data: Date): string {
  return formatoLongo.format(data);
}
