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

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Fortaleza',
});

export function formatarDataHora(data: Date): string {
  return formatoDataHora.format(data);
}

/** Converte Date para valor de `<input type="datetime-local">` (fuso local do navegador). */
export function paraInputDataHora(data: Date | null | undefined): string {
  if (!data) return '';
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}
