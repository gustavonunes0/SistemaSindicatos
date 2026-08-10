import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AtualizarNoticiaInput, CriarNoticiaInput } from '@sindprf/types';
import * as noticiasApi from './api';

const STALE_PUBLICO = 2 * 60 * 1000;
const STALE_ADMIN = 60 * 1000;

export function useNoticias(page: number, limit = 9) {
  return useQuery({
    queryKey: ['noticias', 'publicas', page, limit],
    queryFn: () => noticiasApi.listarNoticias(page, limit),
    staleTime: STALE_PUBLICO,
  });
}

export function useNoticia(slug: string) {
  return useQuery({
    queryKey: ['noticias', 'detalhe', slug],
    queryFn: () => noticiasApi.buscarNoticiaPorSlug(slug),
    staleTime: STALE_PUBLICO,
  });
}

export function useNoticiasAdmin() {
  return useQuery({
    queryKey: ['noticias', 'admin'],
    queryFn: noticiasApi.listarNoticiasAdmin,
    staleTime: STALE_ADMIN,
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
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['noticias'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] });
  };
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

export function useUploadAnexo() {
  return useMutation({ mutationFn: noticiasApi.uploadAnexo });
}
