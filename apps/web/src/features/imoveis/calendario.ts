import type { Periodo } from '@sindprf/types';

export function inicioDoMes(referencia: Date): Date {
  return new Date(referencia.getFullYear(), referencia.getMonth(), 1);
}

export function fimDoMes(referencia: Date): Date {
  return new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function rotuloMes(referencia: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Fortaleza',
  }).format(referencia);
}

/** Gera células do mês (null = vazio antes do dia 1). */
export function diasDoMes(referencia: Date): (number | null)[] {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = Array.from({ length: primeiroDiaSemana }, () => null);
  for (let dia = 1; dia <= totalDias; dia += 1) {
    celulas.push(dia);
  }
  return celulas;
}

function intervalosSobrepostos(aInicio: Date, aFim: Date, bInicio: Date, bFim: Date): boolean {
  return aInicio < bFim && bInicio < aFim;
}

export type EstadoDia = 'livre' | 'reservado' | 'bloqueado';

export function estadoDoDia(
  referencia: Date,
  dia: number,
  periodos: Periodo[],
): EstadoDia {
  const inicioDia = new Date(referencia.getFullYear(), referencia.getMonth(), dia);
  const fimDia = new Date(referencia.getFullYear(), referencia.getMonth(), dia + 1);

  let estado: EstadoDia = 'livre';
  for (const periodo of periodos) {
    if (!intervalosSobrepostos(inicioDia, fimDia, periodo.inicio, periodo.fim)) {
      continue;
    }
    if (periodo.tipo === 'BLOQUEADO') {
      return 'bloqueado';
    }
    estado = 'reservado';
  }
  return estado;
}
