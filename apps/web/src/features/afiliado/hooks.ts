import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAtualizarSenhaAfiliadoInput,
  FiltroAfiliadosInput,
  StatusAfiliado,
} from '@sindprf/types';
import { useEffect, useMemo } from 'react';
import {
  gravarCacheAfiliadosAdmin,
  lerCacheAfiliadosAdmin,
} from '../admin/cache-admin';
import * as afiliadosApi from './api';

function chaveFiltro(filtro: {
  status?: StatusAfiliado;
  busca?: string;
  page: number;
  limit: number;
}): string {
  return `${filtro.status ?? 'todos'}|${filtro.busca ?? ''}|${filtro.page}|${filtro.limit}`;
}

export function useAfiliadosAdmin(
  filtro: Partial<FiltroAfiliadosInput> & { enabled?: boolean } = {},
) {
  const page = filtro.page ?? 1;
  const limit = filtro.limit ?? 20;
  const status = filtro.status;
  const busca = filtro.busca?.trim() || undefined;
  const enabled = filtro.enabled ?? true;
  const filtroKey = chaveFiltro({ status, busca, page, limit });
  const cache = useMemo(() => lerCacheAfiliadosAdmin(filtroKey), [filtroKey]);

  return useQuery({
    queryKey: ['afiliados', 'admin', { status: status ?? 'todos', busca: busca ?? '', page, limit }],
    queryFn: async () => {
      const data = await afiliadosApi.listarAfiliadosAdmin({
        status,
        busca,
        page,
        limit,
      });
      gravarCacheAfiliadosAdmin(filtroKey, data);
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: keepPreviousData,
    initialData: cache,
    initialDataUpdatedAt: cache ? 0 : undefined,
    refetchOnMount: 'always',
    enabled,
  });
}

export function useAtualizarStatusAfiliado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAfiliado }) =>
      afiliadosApi.atualizarStatusAfiliado(id, status),
    onSuccess: () => {
      // Sem limpar o sessionStorage de notícias/convênios — só afiliados.
      void queryClient.invalidateQueries({ queryKey: ['afiliados'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] });
    },
  });
}

export function useAtualizarSenhaAfiliadoAdmin() {
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & AdminAtualizarSenhaAfiliadoInput) =>
      afiliadosApi.atualizarSenhaAfiliadoAdmin(id, input),
  });
}

export function usePrefetchAfiliadosAdmin() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const filtroKey = chaveFiltro({ page: 1, limit: 20 });
    void queryClient.prefetchQuery({
      queryKey: ['afiliados', 'admin', { status: 'todos', busca: '', page: 1, limit: 20 }],
      queryFn: async () => {
        const data = await afiliadosApi.listarAfiliadosAdmin({ page: 1, limit: 20 });
        gravarCacheAfiliadosAdmin(filtroKey, data);
        return data;
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);
}
