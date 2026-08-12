import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdicionarMembroComissaoInput,
  AtualizarCandidatoInput,
  AtualizarChapaInput,
  AtualizarEleicaoInput,
  CriarCandidatoInput,
  CriarChapaInput,
  CriarContestacaoInput,
  CriarEleicaoInput,
  HomologarChapaInput,
  IncluirElegivelInput,
  ResolverContestacaoInput,
} from '@sindprf/types';
import * as eleicaoApi from './api';

function useInvalidarEleicao(eleicaoId?: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['eleicoes'] });
    if (eleicaoId) {
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId] });
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'detalhe', eleicaoId] });
    }
  };
}

// ---- Admin: eleição ----

export function useEleicoesAdmin() {
  return useQuery({
    queryKey: ['eleicoes', 'admin'],
    queryFn: eleicaoApi.listarEleicoesAdmin,
  });
}

export function useEleicaoAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['eleicoes', 'admin', id],
    queryFn: () => eleicaoApi.buscarEleicaoAdmin(id!),
    enabled: Boolean(id),
  });
}

export function useCriarEleicao() {
  const invalidar = useInvalidarEleicao();
  return useMutation({
    mutationFn: (input: CriarEleicaoInput) => eleicaoApi.criarEleicao(input),
    onSuccess: invalidar,
  });
}

export function useAtualizarEleicao() {
  const invalidar = useInvalidarEleicao();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarEleicaoInput & { id: string }) =>
      eleicaoApi.atualizarEleicao(id, input),
    onSuccess: invalidar,
  });
}

export function useRemoverEleicao() {
  const invalidar = useInvalidarEleicao();
  return useMutation({
    mutationFn: eleicaoApi.removerEleicao,
    onSuccess: invalidar,
  });
}

export function useAbrirEleicao(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: () => eleicaoApi.abrirEleicao(eleicaoId),
    onSuccess: invalidar,
  });
}

export function useEncerrarEleicao(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: () => eleicaoApi.encerrarEleicao(eleicaoId),
    onSuccess: invalidar,
  });
}

export function useApurarEleicao(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: () => eleicaoApi.apurarEleicao(eleicaoId),
    onSuccess: invalidar,
  });
}

export function useResolverAclamacao(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: (chapaId: string) => eleicaoApi.resolverAclamacao(eleicaoId, chapaId),
    onSuccess: invalidar,
  });
}

// ---- Admin: chapas/candidatos ----

export function useCriarChapa(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: (input: CriarChapaInput) => eleicaoApi.criarChapa(eleicaoId, input),
    onSuccess: invalidar,
  });
}

export function useAtualizarChapa(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: ({ chapaId, ...input }: AtualizarChapaInput & { chapaId: string }) =>
      eleicaoApi.atualizarChapa(eleicaoId, chapaId, input),
    onSuccess: invalidar,
  });
}

export function useRemoverChapa(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: (chapaId: string) => eleicaoApi.removerChapa(eleicaoId, chapaId),
    onSuccess: invalidar,
  });
}

export function useHomologarChapa(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: ({ chapaId, ...input }: HomologarChapaInput & { chapaId: string }) =>
      eleicaoApi.homologarChapa(eleicaoId, chapaId, input),
    onSuccess: invalidar,
  });
}

export function useCriarCandidato(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: ({ chapaId, ...input }: CriarCandidatoInput & { chapaId: string }) =>
      eleicaoApi.criarCandidato(eleicaoId, chapaId, input),
    onSuccess: invalidar,
  });
}

export function useAtualizarCandidato(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: ({
      chapaId,
      candidatoId,
      ...input
    }: AtualizarCandidatoInput & { chapaId: string; candidatoId: string }) =>
      eleicaoApi.atualizarCandidato(eleicaoId, chapaId, candidatoId, input),
    onSuccess: invalidar,
  });
}

export function useRemoverCandidato(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  return useMutation({
    mutationFn: ({ chapaId, candidatoId }: { chapaId: string; candidatoId: string }) =>
      eleicaoApi.removerCandidato(eleicaoId, chapaId, candidatoId),
    onSuccess: invalidar,
  });
}

// ---- Admin: elegibilidade ----

export function useElegiveis(eleicaoId: string) {
  return useQuery({
    queryKey: ['eleicoes', 'admin', eleicaoId, 'elegiveis'],
    queryFn: () => eleicaoApi.listarElegiveis(eleicaoId),
  });
}

export function useSincronizarElegiveis(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eleicaoApi.sincronizarElegiveis(eleicaoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId] });
    },
  });
}

export function useIncluirElegivel(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IncluirElegivelInput) => eleicaoApi.incluirElegivel(eleicaoId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId] });
    },
  });
}

export function useRemoverElegivel(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (afiliadoId: string) => eleicaoApi.removerElegivel(eleicaoId, afiliadoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId] });
    },
  });
}

// ---- Admin: contestações ----

export function useContestacoes(eleicaoId: string) {
  return useQuery({
    queryKey: ['eleicoes', 'admin', eleicaoId, 'contestacoes'],
    queryFn: () => eleicaoApi.listarContestacoes(eleicaoId),
  });
}

export function useResolverContestacao(eleicaoId: string) {
  const invalidar = useInvalidarEleicao(eleicaoId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contestacaoId,
      ...input
    }: ResolverContestacaoInput & { contestacaoId: string }) =>
      eleicaoApi.resolverContestacao(eleicaoId, contestacaoId, input),
    onSuccess: () => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId, 'contestacoes'] });
    },
  });
}

// ---- Admin: comissão eleitoral ----

export function useComissao(eleicaoId: string) {
  return useQuery({
    queryKey: ['eleicoes', 'admin', eleicaoId, 'comissao'],
    queryFn: () => eleicaoApi.listarComissao(eleicaoId),
  });
}

export function useAdministradores() {
  return useQuery({
    queryKey: ['eleicoes', 'admin', 'usuarios'],
    queryFn: eleicaoApi.listarAdministradores,
  });
}

export function useAdicionarMembroComissao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdicionarMembroComissaoInput) =>
      eleicaoApi.adicionarMembroComissao(eleicaoId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId, 'comissao'] });
    },
  });
}

export function useRemoverMembroComissao(eleicaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => eleicaoApi.removerMembroComissao(eleicaoId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'admin', eleicaoId, 'comissao'] });
    },
  });
}

// ---- Afiliado ----

export function useEleicoes() {
  return useQuery({
    queryKey: ['eleicoes', 'lista'],
    queryFn: eleicaoApi.listarEleicoes,
  });
}

export function useEleicao(id: string) {
  return useQuery({
    queryKey: ['eleicoes', 'detalhe', id],
    queryFn: () => eleicaoApi.buscarEleicao(id),
  });
}

export function useMeuStatusVotacao(id: string) {
  return useQuery({
    queryKey: ['eleicoes', 'detalhe', id, 'meu-status'],
    queryFn: () => eleicaoApi.buscarMeuStatusVotacao(id),
  });
}

export function useVotar(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chapaId: string) => eleicaoApi.votar(id, chapaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleicoes', 'detalhe', id, 'meu-status'] });
    },
  });
}

export function useCriarContestacaoChapa(eleicaoId: string) {
  return useMutation({
    mutationFn: ({ chapaId, motivo }: CriarContestacaoInput & { chapaId: string }) =>
      eleicaoApi.criarContestacaoChapa(eleicaoId, chapaId, { motivo }),
  });
}

export function useResultado(id: string, enabled = true) {
  return useQuery({
    queryKey: ['eleicoes', 'detalhe', id, 'resultado'],
    queryFn: () => eleicaoApi.buscarResultado(id),
    enabled,
  });
}
