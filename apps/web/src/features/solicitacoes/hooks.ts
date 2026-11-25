import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AtualizarStatusSolicitacaoInput,
  CriarSolicitacaoInput,
  CriarSolicitacaoPublicaInput,
  EnviarMensagemInput,
  FiltroSolicitacoesAdminInput,
} from '@sindprf/types';
import * as solicitacoesApi from './api';

const POLLING_MS = 5000;

export function useMinhasSolicitacoes(enabled = true) {
  return useQuery({
    queryKey: ['solicitacoes', 'minhas'],
    queryFn: solicitacoesApi.listarMinhasSolicitacoes,
    enabled,
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

export function useCriarSolicitacaoPublica() {
  return useMutation({
    mutationFn: (input: CriarSolicitacaoPublicaInput) =>
      solicitacoesApi.criarSolicitacaoPublica(input),
  });
}

function useInvalidarReservas() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
    queryClient.invalidateQueries({ queryKey: ['imoveis'] });
  };
}

export function useAtualizarStatusSolicitacao() {
  const invalidar = useInvalidarReservas();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarStatusSolicitacaoInput & { id: string }) =>
      solicitacoesApi.atualizarStatusSolicitacao(id, input),
    onSuccess: invalidar,
  });
}

export function useAprovarSolicitacao() {
  const invalidar = useInvalidarReservas();
  return useMutation({
    mutationFn: (id: string) => solicitacoesApi.aprovarSolicitacao(id),
    onSuccess: invalidar,
  });
}

export function useRecusarSolicitacao() {
  const invalidar = useInvalidarReservas();
  return useMutation({
    mutationFn: (id: string) => solicitacoesApi.recusarSolicitacao(id),
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
