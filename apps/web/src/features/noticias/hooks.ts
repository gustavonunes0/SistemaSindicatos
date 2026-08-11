import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AtualizarNoticiaInput, CriarNoticiaInput } from '@sindprf/types';
import { useEffect, useMemo } from 'react';
import { gravarCacheNoticiasAdmin, lerCacheNoticiasAdmin, limparCachesAdmin } from '../admin/cache-admin';
import * as noticiasApi from './api';
import { gravarCacheNoticias, lerCacheNoticias, limparCacheNoticias } from './cache-local';

const STALE_PUBLICO = 10 * 60 * 1000;
const GC_PUBLICO = 30 * 60 * 1000;

export function useNoticias(page: number, limit = 9) {
  const cache = useMemo(() => lerCacheNoticias(page, limit), [page, limit]);

  return useQuery({
    queryKey: ['noticias', 'publicas', page, limit],
    queryFn: async () => {
      const data = await noticiasApi.listarNoticias(page, limit);
      gravarCacheNoticias(page, limit, data);
      return data;
    },
    staleTime: STALE_PUBLICO,
    gcTime: GC_PUBLICO,
    // Pinta na hora com o último resultado; revalida em background.
    initialData: cache,
    initialDataUpdatedAt: cache ? Date.now() - STALE_PUBLICO + 5_000 : undefined,
    placeholderData: (anterior) => anterior ?? cache,
  });
}

export function useNoticia(slug: string) {
  return useQuery({
    queryKey: ['noticias', 'detalhe', slug],
    queryFn: () => noticiasApi.buscarNoticiaPorSlug(slug),
    staleTime: STALE_PUBLICO,
    gcTime: GC_PUBLICO,
  });
}

export function useNoticiasAdmin() {
  const cache = useMemo(() => lerCacheNoticiasAdmin(), []);
  return useQuery({
    queryKey: ['noticias', 'admin'],
    queryFn: async () => {
      const data = await noticiasApi.listarNoticiasAdmin();
      gravarCacheNoticiasAdmin(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: cache,
    initialDataUpdatedAt: cache ? Date.now() - 60_000 : undefined,
    placeholderData: (anterior) => anterior ?? cache,
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
    limparCacheNoticias();
    limparCachesAdmin();
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

/** Prefetch da 1ª página — chama no layout público para aquecer cache. */
export function usePrefetchNoticias() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ['noticias', 'publicas', 1, 9],
      queryFn: async () => {
        const data = await noticiasApi.listarNoticias(1, 9);
        gravarCacheNoticias(1, 9, data);
        return data;
      },
      staleTime: STALE_PUBLICO,
    });
    void queryClient.prefetchQuery({
      queryKey: ['noticias', 'publicas', 1, 3],
      queryFn: async () => {
        const data = await noticiasApi.listarNoticias(1, 3);
        gravarCacheNoticias(1, 3, data);
        return data;
      },
      staleTime: STALE_PUBLICO,
    });
  }, [queryClient]);
}

export function usePrefetchNoticiasAdmin() {
  const queryClient = useQueryClient();
  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ['noticias', 'admin'],
      queryFn: async () => {
        const data = await noticiasApi.listarNoticiasAdmin();
        gravarCacheNoticiasAdmin(data);
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
}
