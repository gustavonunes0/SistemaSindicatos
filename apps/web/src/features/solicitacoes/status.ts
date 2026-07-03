import type { StatusSolicitacao } from '@sindprf/types';

export const rotuloStatusSolicitacao: Record<StatusSolicitacao, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  FECHADA: 'Fechada',
};

export const classeStatusSolicitacao: Record<StatusSolicitacao, string> = {
  ABERTA: 'badge-solicitacao-aberta',
  EM_ANDAMENTO: 'badge-solicitacao-andamento',
  FECHADA: 'badge-solicitacao-fechada',
};
