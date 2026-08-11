import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AtualizarConvenioInput,
  CriarConvenioInput,
  EmitirDeclaracaoInput,
  FiltroConveniosInput,
} from '@sindprf/types';
import { useEffect, useMemo } from 'react';
import {
  gravarCacheConveniosAdmin,
  lerCacheConveniosAdmin,
  limparCachesAdmin,
} from '../admin/cache-admin';
import * as conveniosApi from './api';

export function useConvenios(filtro: FiltroConveniosInput, enabled = true) {
  return useQuery({
    queryKey: ['convenios', 'lista', filtro],
    queryFn: () => conveniosApi.listarConvenios(filtro),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCategoriasConvenios(enabled = true) {
  return useQuery({
    queryKey: ['convenios', 'categorias'],
    queryFn: conveniosApi.listarCategorias,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useConvenio(id: string) {
  return useQuery({
    queryKey: ['convenios', 'detalhe', id],
    queryFn: () => conveniosApi.buscarConvenio(id),
    staleTime: 2 * 60 * 1000,
  });
}

export function useConveniosAdmin() {
  const cache = useMemo(() => lerCacheConveniosAdmin(), []);
  return useQuery({
    queryKey: ['convenios', 'admin'],
    queryFn: async () => {
      const data = await conveniosApi.listarConveniosAdmin();
      gravarCacheConveniosAdmin(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: cache,
    initialDataUpdatedAt: cache ? Date.now() - 60_000 : undefined,
    placeholderData: (anterior) => anterior ?? cache,
  });
}

export function useConvenioAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['convenios', 'admin', id],
    queryFn: () => conveniosApi.buscarConvenioAdmin(id!),
    enabled: Boolean(id),
  });
}

function useInvalidarConvenios() {
  const queryClient = useQueryClient();
  return () => {
    limparCachesAdmin();
    void queryClient.invalidateQueries({ queryKey: ['convenios'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] });
  };
}

export function useCriarConvenio() {
  const invalidar = useInvalidarConvenios();
  return useMutation({
    mutationFn: (input: CriarConvenioInput) => conveniosApi.criarConvenio(input),
    onSuccess: invalidar,
  });
}

export function useAtualizarConvenio() {
  const invalidar = useInvalidarConvenios();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarConvenioInput & { id: string }) =>
      conveniosApi.atualizarConvenio(id, input),
    onSuccess: invalidar,
  });
}

export function useRemoverConvenio() {
  const invalidar = useInvalidarConvenios();
  return useMutation({
    mutationFn: conveniosApi.removerConvenio,
    onSuccess: invalidar,
  });
}

export function useEmitirDeclaracao() {
  return useMutation({
    mutationFn: ({ id, ...input }: EmitirDeclaracaoInput & { id: string }) =>
      conveniosApi.emitirDeclaracao(id, input),
  });
}

export function usePrefetchConveniosAdmin() {
  const queryClient = useQueryClient();
  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ['convenios', 'admin'],
      queryFn: async () => {
        const data = await conveniosApi.listarConveniosAdmin();
        gravarCacheConveniosAdmin(data);
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
}
