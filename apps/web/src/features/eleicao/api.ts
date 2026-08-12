import {
  administradorResumoSchema,
  chapaSchema,
  comprovanteVotoSchema,
  contestacaoSchema,
  eleicaoAdminDetalheSchema,
  eleicaoDetalheSchema,
  eleicaoResumoSchema,
  elegivelResumoSchema,
  membroComissaoSchema,
  meuStatusVotacaoSchema,
  resultadoEleicaoSchema,
  type AdicionarMembroComissaoInput,
  type AdministradorResumo,
  type AtualizarCandidatoInput,
  type AtualizarChapaInput,
  type AtualizarEleicaoInput,
  type Chapa,
  type Contestacao,
  type CriarCandidatoInput,
  type CriarChapaInput,
  type CriarContestacaoInput,
  type CriarEleicaoInput,
  type EleicaoAdminDetalhe,
  type EleicaoDetalhe,
  type EleicaoResumo,
  type ElegivelResumo,
  type HomologarChapaInput,
  type IncluirElegivelInput,
  type MembroComissao,
  type MeuStatusVotacao,
  type ResolverContestacaoInput,
  type ResultadoEleicao,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

// ---- Admin: eleição ----

export async function criarEleicao(input: CriarEleicaoInput): Promise<EleicaoResumo> {
  const { data } = await api.post('/eleicoes', input);
  return eleicaoResumoSchema.parse(data);
}

export async function listarEleicoesAdmin(): Promise<EleicaoResumo[]> {
  const { data } = await api.get('/eleicoes/admin');
  return z.array(eleicaoResumoSchema).parse(data);
}

export async function buscarEleicaoAdmin(id: string): Promise<EleicaoAdminDetalhe> {
  const { data } = await api.get(`/eleicoes/admin/${id}`);
  return eleicaoAdminDetalheSchema.parse(data);
}

export async function atualizarEleicao(
  id: string,
  input: AtualizarEleicaoInput,
): Promise<EleicaoResumo> {
  const { data } = await api.patch(`/eleicoes/${id}`, input);
  return eleicaoResumoSchema.parse(data);
}

export async function removerEleicao(id: string): Promise<void> {
  await api.delete(`/eleicoes/${id}`);
}

export async function abrirEleicao(id: string): Promise<EleicaoResumo> {
  const { data } = await api.post(`/eleicoes/${id}/abrir`);
  return eleicaoResumoSchema.parse(data);
}

export async function encerrarEleicao(id: string): Promise<EleicaoResumo> {
  const { data } = await api.post(`/eleicoes/${id}/encerrar`);
  return eleicaoResumoSchema.parse(data);
}

export async function apurarEleicao(id: string): Promise<ResultadoEleicao> {
  const { data } = await api.post(`/eleicoes/${id}/apurar`);
  return resultadoEleicaoSchema.parse(data);
}

export async function resolverAclamacao(id: string, chapaId: string): Promise<ResultadoEleicao> {
  const { data } = await api.post(`/eleicoes/${id}/aclamacao`, { chapaId });
  return resultadoEleicaoSchema.parse(data);
}

// ---- Admin: chapas/candidatos ----

export async function criarChapa(eleicaoId: string, input: CriarChapaInput): Promise<Chapa> {
  const { data } = await api.post(`/eleicoes/${eleicaoId}/chapas`, input);
  return chapaSchema.parse(data);
}

export async function atualizarChapa(
  eleicaoId: string,
  chapaId: string,
  input: AtualizarChapaInput,
): Promise<Chapa> {
  const { data } = await api.patch(`/eleicoes/${eleicaoId}/chapas/${chapaId}`, input);
  return chapaSchema.parse(data);
}

export async function removerChapa(eleicaoId: string, chapaId: string): Promise<void> {
  await api.delete(`/eleicoes/${eleicaoId}/chapas/${chapaId}`);
}

export async function homologarChapa(
  eleicaoId: string,
  chapaId: string,
  input: HomologarChapaInput,
): Promise<Chapa> {
  const { data } = await api.patch(`/eleicoes/${eleicaoId}/chapas/${chapaId}/homologar`, input);
  return chapaSchema.parse(data);
}

export async function criarCandidato(
  eleicaoId: string,
  chapaId: string,
  input: CriarCandidatoInput,
): Promise<Chapa> {
  const { data } = await api.post(`/eleicoes/${eleicaoId}/chapas/${chapaId}/candidatos`, input);
  return chapaSchema.parse(data);
}

export async function atualizarCandidato(
  eleicaoId: string,
  chapaId: string,
  candidatoId: string,
  input: AtualizarCandidatoInput,
): Promise<Chapa> {
  const { data } = await api.patch(
    `/eleicoes/${eleicaoId}/chapas/${chapaId}/candidatos/${candidatoId}`,
    input,
  );
  return chapaSchema.parse(data);
}

export async function removerCandidato(
  eleicaoId: string,
  chapaId: string,
  candidatoId: string,
): Promise<void> {
  await api.delete(`/eleicoes/${eleicaoId}/chapas/${chapaId}/candidatos/${candidatoId}`);
}

// ---- Admin: elegibilidade ----

export async function sincronizarElegiveis(eleicaoId: string): Promise<{ incluidos: number }> {
  const { data } = await api.post(`/eleicoes/${eleicaoId}/elegiveis/sincronizar`);
  return z.object({ incluidos: z.number() }).parse(data);
}

export async function listarElegiveis(eleicaoId: string): Promise<ElegivelResumo[]> {
  const { data } = await api.get(`/eleicoes/${eleicaoId}/elegiveis`);
  return z.array(elegivelResumoSchema).parse(data);
}

export async function incluirElegivel(
  eleicaoId: string,
  input: IncluirElegivelInput,
): Promise<void> {
  await api.post(`/eleicoes/${eleicaoId}/elegiveis`, input);
}

export async function removerElegivel(eleicaoId: string, afiliadoId: string): Promise<void> {
  await api.delete(`/eleicoes/${eleicaoId}/elegiveis/${afiliadoId}`);
}

// ---- Admin: contestações ----

export async function listarContestacoes(eleicaoId: string): Promise<Contestacao[]> {
  const { data } = await api.get(`/eleicoes/${eleicaoId}/contestacoes`);
  return z.array(contestacaoSchema).parse(data);
}

export async function resolverContestacao(
  eleicaoId: string,
  contestacaoId: string,
  input: ResolverContestacaoInput,
): Promise<Contestacao> {
  const { data } = await api.patch(
    `/eleicoes/${eleicaoId}/contestacoes/${contestacaoId}`,
    input,
  );
  return contestacaoSchema.parse(data);
}

// ---- Admin: comissão eleitoral ----

export async function listarComissao(eleicaoId: string): Promise<MembroComissao[]> {
  const { data } = await api.get(`/eleicoes/${eleicaoId}/comissao`);
  return z.array(membroComissaoSchema).parse(data);
}

export async function listarAdministradores(): Promise<AdministradorResumo[]> {
  const { data } = await api.get('/eleicoes/admin/usuarios');
  return z.array(administradorResumoSchema).parse(data);
}

export async function adicionarMembroComissao(
  eleicaoId: string,
  input: AdicionarMembroComissaoInput,
): Promise<MembroComissao> {
  const { data } = await api.post(`/eleicoes/${eleicaoId}/comissao`, input);
  return membroComissaoSchema.parse(data);
}

export async function removerMembroComissao(eleicaoId: string, userId: string): Promise<void> {
  await api.delete(`/eleicoes/${eleicaoId}/comissao/${userId}`);
}

// ---- Afiliado ----

export async function listarEleicoes(): Promise<EleicaoResumo[]> {
  const { data } = await api.get('/eleicoes');
  return z.array(eleicaoResumoSchema).parse(data);
}

export async function buscarEleicao(id: string): Promise<EleicaoDetalhe> {
  const { data } = await api.get(`/eleicoes/${id}`);
  return eleicaoDetalheSchema.parse(data);
}

export async function buscarMeuStatusVotacao(id: string): Promise<MeuStatusVotacao> {
  const { data } = await api.get(`/eleicoes/${id}/meu-status`);
  return meuStatusVotacaoSchema.parse(data);
}

export async function votar(id: string, chapaId: string) {
  const { data } = await api.post(`/eleicoes/${id}/votar`, { chapaId });
  return comprovanteVotoSchema.parse(data);
}

export async function criarContestacaoChapa(
  eleicaoId: string,
  chapaId: string,
  input: CriarContestacaoInput,
): Promise<Contestacao> {
  const { data } = await api.post(
    `/eleicoes/${eleicaoId}/chapas/${chapaId}/contestacoes`,
    input,
  );
  return contestacaoSchema.parse(data);
}

export async function buscarResultado(id: string): Promise<ResultadoEleicao> {
  const { data } = await api.get(`/eleicoes/${id}/resultado`);
  return resultadoEleicaoSchema.parse(data);
}
