const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function nomeCompetencia(mes: number, ano: number): string {
  return `${MESES[mes - 1] ?? mes} de ${ano}`;
}

export function percentual(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((Math.abs(parte) / total) * 100));
}
