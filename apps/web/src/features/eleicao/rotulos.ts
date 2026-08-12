import type { ChapaStatus, StatusContestacao, StatusEleicao, TipoContestacao } from '@sindprf/types';

/** Rótulo visto pelo filiado — descreve o que está acontecendo, não o estado interno. */
export const rotuloStatusEleicao: Record<StatusEleicao, string> = {
  AGENDADA: 'Votação agendada',
  ABERTA: 'Votação aberta',
  ENCERRADA: 'Votação encerrada',
  APURADA: 'Resultado apurado',
};

/** Rótulo curto para listas e badges do admin. */
export const rotuloStatusEleicaoCurto: Record<StatusEleicao, string> = {
  AGENDADA: 'Agendada',
  ABERTA: 'Aberta',
  ENCERRADA: 'Encerrada',
  APURADA: 'Apurada',
};

export const rotuloStatusChapa: Record<ChapaStatus, string> = {
  INSCRITA: 'Aguardando homologação',
  HOMOLOGADA: 'Homologada',
  NAO_HOMOLOGADA: 'Não homologada',
};

export const rotuloTipoContestacao: Record<TipoContestacao, string> = {
  IMPUGNACAO: 'Impugnação',
  RECURSO: 'Recurso',
};

export const rotuloStatusContestacao: Record<StatusContestacao, string> = {
  ABERTA: 'Aberta',
  DEFERIDA: 'Deferida',
  INDEFERIDA: 'Indeferida',
};

/** Número da chapa como aparece na cédula: dois dígitos. */
export function numeroCedula(numero: number): string {
  return String(numero).padStart(2, '0');
}
