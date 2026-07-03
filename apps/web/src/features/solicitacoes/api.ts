import {
  mensagemSchema,
  solicitacaoAluguelSchema,
  solicitacaoResumoSchema,
  type AtualizarStatusSolicitacaoInput,
  type CriarSolicitacaoInput,
  type EnviarMensagemInput,
  type FiltroSolicitacoesAdminInput,
  type Mensagem,
  type SolicitacaoAluguel,
  type SolicitacaoResumo,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function criarSolicitacao(input: CriarSolicitacaoInput): Promise<SolicitacaoAluguel> {
  const { data } = await api.post('/solicitacoes', {
    ...input,
    inicioDesejado: input.inicioDesejado.toISOString(),
    fimDesejado: input.fimDesejado.toISOString(),
  });
  return solicitacaoAluguelSchema.parse(data);
}

export async function listarMinhasSolicitacoes(): Promise<SolicitacaoResumo[]> {
  const { data } = await api.get('/solicitacoes/minhas');
  return z.array(solicitacaoResumoSchema).parse(data);
}

export async function listarSolicitacoesAdmin(
  filtro: FiltroSolicitacoesAdminInput,
): Promise<SolicitacaoResumo[]> {
  const { data } = await api.get('/solicitacoes/admin', { params: filtro });
  return z.array(solicitacaoResumoSchema).parse(data);
}

export async function buscarSolicitacao(id: string): Promise<SolicitacaoResumo> {
  const { data } = await api.get(`/solicitacoes/${id}`);
  return solicitacaoResumoSchema.parse(data);
}

export async function atualizarStatusSolicitacao(
  id: string,
  input: AtualizarStatusSolicitacaoInput,
): Promise<SolicitacaoResumo> {
  const { data } = await api.patch(`/solicitacoes/${id}/status`, input);
  return solicitacaoResumoSchema.parse(data);
}

export async function listarMensagens(solicitacaoId: string): Promise<Mensagem[]> {
  const { data } = await api.get(`/solicitacoes/${solicitacaoId}/mensagens`);
  return z.array(mensagemSchema).parse(data);
}

export async function enviarMensagem(
  solicitacaoId: string,
  input: EnviarMensagemInput,
): Promise<Mensagem> {
  const { data } = await api.post(`/solicitacoes/${solicitacaoId}/mensagens`, input);
  return mensagemSchema.parse(data);
}
