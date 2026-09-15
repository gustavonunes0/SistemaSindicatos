import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AtualizarEstatutoInput, CriarEstatutoInput } from '@sindprf/types';
import * as estatutosApi from './api';

export function useEstatutosAdmin() {
  return useQuery({
    queryKey: ['estatutos', 'admin'],
    queryFn: estatutosApi.listarEstatutosAdmin,
  });
}

export function useEstatutos() {
  return useQuery({
    queryKey: ['estatutos', 'afiliado'],
    queryFn: estatutosApi.listarEstatutos,
  });
}

export function useCriarEstatuto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, arquivo }: { input: CriarEstatutoInput; arquivo: File }) =>
      estatutosApi.criarEstatuto(input, arquivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['estatutos'] });
    },
  });
}

export function useAtualizarEstatuto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarEstatutoInput & { id: string }) =>
      estatutosApi.atualizarEstatuto(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['estatutos'] });
    },
  });
}

export function useRemoverEstatuto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: estatutosApi.removerEstatuto,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['estatutos'] });
    },
  });
}
