import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AtualizarStatusSolicitacaoInput,
  CriarSolicitacaoInput,
  EnviarMensagemInput,
  FiltroSolicitacoesAdminInput,
} from '@sindprf/types';
import * as solicitacoesApi from './api';

const POLLING_MS = 5000;

export function useMinhasSolicitacoes() {
  return useQuery({
    queryKey: ['solicitacoes', 'minhas'],
    queryFn: solicitacoesApi.listarMinhasSolicitacoes,
  });
}

export function useSolicitacoesAdmin(filtro: FiltroSolicitacoesAdminInput) {
  return useQuery({
    queryKey: ['solicitacoes', 'admin', filtro],
    queryFn: () => solicitacoesApi.listarSolicitacoesAdmin(filtro),
  });
}

export function useSolicitacao(id: string | undefined) {
  return useQuery({
    queryKey: ['solicitacoes', 'detalhe', id],
    queryFn: () => solicitacoesApi.buscarSolicitacao(id!),
    enabled: Boolean(id),
  });
}

export function useMensagensSolicitacao(solicitacaoId: string | undefined, polling = true) {
  return useQuery({
    queryKey: ['solicitacoes', solicitacaoId, 'mensagens'],
    queryFn: () => solicitacoesApi.listarMensagens(solicitacaoId!),
    enabled: Boolean(solicitacaoId),
    refetchInterval: polling ? POLLING_MS : false,
  });
}

function useInvalidarSolicitacoes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
}

export function useCriarSolicitacao() {
  const invalidar = useInvalidarSolicitacoes();
  return useMutation({
    mutationFn: (input: CriarSolicitacaoInput) => solicitacoesApi.criarSolicitacao(input),
    onSuccess: invalidar,
  });
}

export function useAtualizarStatusSolicitacao() {
  const invalidar = useInvalidarSolicitacoes();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarStatusSolicitacaoInput & { id: string }) =>
      solicitacoesApi.atualizarStatusSolicitacao(id, input),
    onSuccess: invalidar,
  });
}

export function useEnviarMensagem(solicitacaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EnviarMensagemInput) =>
      solicitacoesApi.enviarMensagem(solicitacaoId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes', solicitacaoId, 'mensagens'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
    },
  });
}
