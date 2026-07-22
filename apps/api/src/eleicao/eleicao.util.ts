import type { Candidato, Chapa, ContestacaoChapa, Eleicao } from '@prisma/client';
import type {
  Candidato as CandidatoDto,
  Chapa as ChapaDto,
  Contestacao as ContestacaoDto,
  EleicaoDetalhe,
  EleicaoResumo,
} from '@sindprf/types';

export function serializarEleicaoResumo(eleicao: Eleicao): EleicaoResumo {
  return {
    id: eleicao.id,
    titulo: eleicao.titulo,
    descricao: eleicao.descricao,
    inicio: eleicao.inicio,
    fim: eleicao.fim,
    status: eleicao.status,
    resolvidaPorAclamacao: eleicao.resolvidaPorAclamacao,
  };
}

export function serializarCandidato(candidato: Candidato): CandidatoDto {
  return {
    id: candidato.id,
    chapaId: candidato.chapaId,
    nome: candidato.nome,
    cargo: candidato.cargo,
    fotoUrl: candidato.fotoUrl,
  };
}

type ChapaComCandidatos = Chapa & { candidatos: Candidato[] };

export function serializarChapa(chapa: ChapaComCandidatos): ChapaDto {
  return {
    id: chapa.id,
    eleicaoId: chapa.eleicaoId,
    numero: chapa.numero,
    nome: chapa.nome,
    slogan: chapa.slogan,
    status: chapa.status,
    justificativaHomologacao: chapa.justificativaHomologacao,
    homologadaEm: chapa.homologadaEm,
    prazoContestacaoFim: chapa.prazoContestacaoFim,
    candidatos: chapa.candidatos.map(serializarCandidato),
  };
}

type EleicaoComChapas = Eleicao & { chapas: ChapaComCandidatos[] };

export function serializarEleicaoDetalhe(eleicao: EleicaoComChapas): EleicaoDetalhe {
  return {
    ...serializarEleicaoResumo(eleicao),
    chapas: eleicao.chapas.map(serializarChapa),
  };
}

export function serializarContestacao(contestacao: ContestacaoChapa): ContestacaoDto {
  return {
    id: contestacao.id,
    chapaId: contestacao.chapaId,
    tipo: contestacao.tipo,
    status: contestacao.status,
    motivo: contestacao.motivo,
    decisao: contestacao.decisao,
    decididoEm: contestacao.decididoEm,
    createdAt: contestacao.createdAt,
  };
}
