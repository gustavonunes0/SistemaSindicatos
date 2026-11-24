/** Regras do Regulamento de Uso dos Espaços Coletivos (SINDPRF-CE, 26/03/2026). */

export type PerfilHospedagem = 'FILIADO_SINDPRF' | 'FILIADO_OUTRO' | 'NAO_FILIADO';

export type FaixaDiaria = {
  /** Dia inicial da faixa (1-based no período contínuo). */
  de: number;
  /** Dia final inclusivo; omitido = até o máximo. */
  ate?: number;
  valorPorDia: number;
  rotulo: string;
};

export type RegrasPerfilHospedagem = {
  perfil: PerfilHospedagem;
  titulo: string;
  faixas: FaixaDiaria[];
  maxContinuoDias: number;
  intervaloMinimoDias: number;
  limiteAnualDias: number;
};

export const REGRAS_HOSPEDAGEM: Record<PerfilHospedagem, RegrasPerfilHospedagem> = {
  FILIADO_SINDPRF: {
    perfil: 'FILIADO_SINDPRF',
    titulo: 'Filiado SINDPRF-CE',
    faixas: [
      { de: 1, ate: 7, valorPorDia: 0, rotulo: 'Até 7 dias — gratuito' },
      { de: 8, ate: 14, valorPorDia: 30, rotulo: 'Do 8º ao 14º dia — R$ 30/dia' },
    ],
    maxContinuoDias: 14,
    intervaloMinimoDias: 14,
    limiteAnualDias: 60,
  },
  FILIADO_OUTRO: {
    perfil: 'FILIADO_OUTRO',
    titulo: 'Filiado a outro estado',
    faixas: [
      { de: 1, ate: 7, valorPorDia: 50, rotulo: '1º ao 7º dia — R$ 50/dia' },
      { de: 8, ate: 14, valorPorDia: 60, rotulo: '8º ao 14º dia — R$ 60/dia' },
    ],
    maxContinuoDias: 14,
    intervaloMinimoDias: 14,
    limiteAnualDias: 30,
  },
  NAO_FILIADO: {
    perfil: 'NAO_FILIADO',
    titulo: 'PRF não filiado',
    faixas: [{ de: 1, ate: 7, valorPorDia: 70, rotulo: 'R$ 70 por dia' }],
    maxContinuoDias: 7,
    intervaloMinimoDias: 30,
    limiteAnualDias: 14,
  },
};

/** Noites entre entrada e saída (checkout no dia final não conta como diária extra). */
export function diasHospedagem(inicio: Date, fim: Date): number {
  const a = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const b = Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate());
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function estimarCustoHospedagem(
  perfil: PerfilHospedagem,
  dias: number,
): { total: number; detalhe: string } {
  const regras = REGRAS_HOSPEDAGEM[perfil];
  if (dias <= 0) return { total: 0, detalhe: 'Informe as datas' };
  if (dias > regras.maxContinuoDias) {
    return {
      total: 0,
      detalhe: `Máximo contínuo: ${regras.maxContinuoDias} dias`,
    };
  }

  let total = 0;
  for (let dia = 1; dia <= dias; dia += 1) {
    const faixa = regras.faixas.find((f) => dia >= f.de && (f.ate == null || dia <= f.ate));
    total += faixa?.valorPorDia ?? 0;
  }

  if (total === 0) {
    return { total: 0, detalhe: `${dias} dia${dias === 1 ? '' : 's'} — gratuito` };
  }
  return {
    total,
    detalhe: `${dias} dia${dias === 1 ? '' : 's'} — estimativa R$ ${total.toLocaleString('pt-BR')}`,
  };
}

export const REGRAS_RESERVA_RESUMO = [
  'Reserva válida só após confirmação da Presidência (análise pela Diretoria Social).',
  'Indique previamente todos os acompanhantes.',
  'Prioridade aos filiados do SINDPRF-CE residentes no interior.',
  'A reserva é pessoal: quem reserva deve estar presente na hospedagem.',
  'Prorrogações só com solicitação justificada à Presidência.',
] as const;
