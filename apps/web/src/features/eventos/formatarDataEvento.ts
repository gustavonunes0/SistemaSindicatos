/** Data de calendário (@db.Date) — formata em UTC para não mudar o dia no fuso local. */
export function formatarDataEvento(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(data);
}

/** Valor de `<input type="date">` a partir de uma data de calendário. */
export function paraInputDataEvento(data: Date | null | undefined): string {
  if (!data) return '';
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
