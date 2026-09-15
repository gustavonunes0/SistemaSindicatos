import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AtualizarRecursoDiretoriaInput, CriarRecursoDiretoriaInput } from '@sindprf/types';
import * as diretoriaApi from './api';

export function useRecursosDiretoriaAdmin() {
  return useQuery({
    queryKey: ['diretoria', 'recursos', 'admin'],
    queryFn: diretoriaApi.listarRecursosDiretoriaAdmin,
  });
}

export function useRecursosDiretoria() {
  return useQuery({
    queryKey: ['diretoria', 'recursos', 'meus'],
    queryFn: diretoriaApi.listarRecursosDiretoria,
  });
}

export function useCriarRecursoDiretoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarRecursoDiretoriaInput) => diretoriaApi.criarRecursoDiretoria(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['diretoria', 'recursos'] });
    },
  });
}

export function useAtualizarRecursoDiretoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarRecursoDiretoriaInput & { id: string }) =>
      diretoriaApi.atualizarRecursoDiretoria(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['diretoria', 'recursos'] });
    },
  });
}

export function useRemoverRecursoDiretoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: diretoriaApi.removerRecursoDiretoria,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['diretoria', 'recursos'] });
    },
  });
}
