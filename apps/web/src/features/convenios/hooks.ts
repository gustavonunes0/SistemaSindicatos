import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AtualizarConvenioInput,
  Convenio,
  ConvenioListagem,
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

function convenioDaListagem(item: ConvenioListagem): Convenio {
  return { ...item, textoComplementar: null };
}

function acharConvenioNasListas(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
): Convenio | undefined {
  const listas = queryClient.getQueriesData<ConvenioListagem[]>({
    queryKey: ['convenios', 'lista'],
  });
  for (const [, lista] of listas) {
    const achado = lista?.find((item) => item.id === id);
    if (achado) return convenioDaListagem(achado);
  }
  return undefined;
}

function popularCacheDetalhe(
  queryClient: ReturnType<typeof useQueryClient>,
  lista: ConvenioListagem[],
) {
  for (const item of lista) {
    const chave = ['convenios', 'detalhe', item.id] as const;
    if (!queryClient.getQueryData(chave)) {
      queryClient.setQueryData(chave, convenioDaListagem(item));
    }
  }
}

export function useConvenios(filtro: FiltroConveniosInput, enabled = true) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['convenios', 'lista', filtro],
    queryFn: async () => {
      const data = await conveniosApi.listarConvenios(filtro);
      popularCacheDetalhe(queryClient, data);
      return data;
    },
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
  const queryClient = useQueryClient();
  const daLista = useMemo(
    () => (id ? acharConvenioNasListas(queryClient, id) : undefined),
    [id, queryClient],
  );

  return useQuery({
    queryKey: ['convenios', 'detalhe', id],
    queryFn: () => conveniosApi.buscarConvenio(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    placeholderData: () =>
      queryClient.getQueryData<Convenio>(['convenios', 'detalhe', id]) ?? daLista,
  });
}

export function prefetchConvenio(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  const daLista = acharConvenioNasListas(queryClient, id);
  if (daLista && !queryClient.getQueryData(['convenios', 'detalhe', id])) {
    queryClient.setQueryData(['convenios', 'detalhe', id], daLista);
  }
  return queryClient.prefetchQuery({
    queryKey: ['convenios', 'detalhe', id],
    queryFn: () => conveniosApi.buscarConvenio(id),
    staleTime: 5 * 60 * 1000,
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
    initialDataUpdatedAt: cache ? 0 : undefined,
    placeholderData: (anterior) => anterior ?? cache,
    refetchOnMount: 'always',
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
