import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AtualizarNoticiaInput, CriarNoticiaInput } from '@sindprf/types';
import * as noticiasApi from './api';

export function useNoticias(page: number, limit = 9) {
  return useQuery({
    queryKey: ['noticias', 'publicas', page, limit],
    queryFn: () => noticiasApi.listarNoticias(page, limit),
  });
}

export function useNoticia(slug: string) {
  return useQuery({
    queryKey: ['noticias', 'detalhe', slug],
    queryFn: () => noticiasApi.buscarNoticiaPorSlug(slug),
  });
}

export function useNoticiasAdmin() {
  return useQuery({
    queryKey: ['noticias', 'admin'],
    queryFn: noticiasApi.listarNoticiasAdmin,
  });
}

export function useNoticiaAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['noticias', 'admin', id],
    queryFn: () => noticiasApi.buscarNoticiaAdmin(id!),
    enabled: Boolean(id),
  });
}

function useInvalidarNoticias() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['noticias'] });
}

export function useCriarNoticia() {
  const invalidar = useInvalidarNoticias();
  return useMutation({
    mutationFn: (input: CriarNoticiaInput) => noticiasApi.criarNoticia(input),
    onSuccess: invalidar,
  });
}

export function useAtualizarNoticia() {
  const invalidar = useInvalidarNoticias();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarNoticiaInput & { id: string }) =>
      noticiasApi.atualizarNoticia(id, input),
    onSuccess: invalidar,
  });
}

export function useRemoverNoticia() {
  const invalidar = useInvalidarNoticias();
  return useMutation({
    mutationFn: noticiasApi.removerNoticia,
    onSuccess: invalidar,
  });
}

export function useUploadCapa() {
  return useMutation({ mutationFn: noticiasApi.uploadCapa });
}
