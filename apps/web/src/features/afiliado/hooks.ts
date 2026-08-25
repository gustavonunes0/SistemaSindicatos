import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAtualizarSenhaAfiliadoInput,
  CadastroAfiliadoAdminInput,
  CadastroAfiliadoInput,
  DirecaoOrdenacao,
  FiltroAfiliadosInput,
  OrdenacaoAfiliado,
  StatusAfiliado,
} from '@sindprf/types';
import { useEffect, useMemo } from 'react';
import {
  gravarCacheAfiliadosAdmin,
  lerCacheAfiliadosAdmin,
} from '../admin/cache-admin';
import * as afiliadosApi from './api';
import type { DocumentoAfiliado } from '@sindprf/types';

type FiltroLista = {
  status?: StatusAfiliado;
  busca?: string;
  page: number;
  limit: number;
  ordenar: OrdenacaoAfiliado;
  direcao: DirecaoOrdenacao;
};

function chaveFiltro(filtro: FiltroLista): string {
  return [
    filtro.status ?? 'todos',
    filtro.busca ?? '',
    filtro.page,
    filtro.limit,
    filtro.ordenar,
    filtro.direcao,
  ].join('|');
}

/** Opções compartilhadas entre a consulta da página atual e todo prefetch da lista. */
export function opcoesListaAfiliadosAdmin(filtro: FiltroLista) {
  const filtroKey = chaveFiltro(filtro);
  return {
    queryKey: [
      'afiliados',
      'admin',
      {
        status: filtro.status ?? 'todos',
        busca: filtro.busca ?? '',
        page: filtro.page,
        limit: filtro.limit,
        ordenar: filtro.ordenar,
        direcao: filtro.direcao,
      },
    ],
    queryFn: async () => {
      const data = await afiliadosApi.listarAfiliadosAdmin(filtro);
      gravarCacheAfiliadosAdmin(filtroKey, data);
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  };
}

export function useAfiliadosAdmin(
  filtro: Partial<FiltroAfiliadosInput> & { enabled?: boolean; prefetchVizinhas?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const page = filtro.page ?? 1;
  const limit = filtro.limit ?? 20;
  const status = filtro.status;
  const busca = filtro.busca?.trim() || undefined;
  const enabled = filtro.enabled ?? true;
  const prefetchVizinhas = filtro.prefetchVizinhas ?? false;
  const ordenar = filtro.ordenar ?? 'nome';
  const direcao = filtro.direcao ?? 'asc';
  const filtroKey = chaveFiltro({ status, busca, page, limit, ordenar, direcao });
  const cache = useMemo(() => lerCacheAfiliadosAdmin(filtroKey), [filtroKey]);

  const consulta = useQuery({
    ...opcoesListaAfiliadosAdmin({ status, busca, page, limit, ordenar, direcao }),
    placeholderData: keepPreviousData,
    initialData: cache,
    initialDataUpdatedAt: cache ? 0 : undefined,
    refetchOnMount: 'always',
    enabled,
  });

  // O banco fica em outra região: cada página nova custa uma ida e volta. Deixar
  // as vizinhas prontas no cache faz a troca de página responder na hora.
  const totalPages = consulta.data?.totalPages ?? 1;
  const carregando = consulta.isFetching;
  useEffect(() => {
    if (!prefetchVizinhas || !enabled || carregando) return;
    for (const vizinha of [page + 1, page - 1]) {
      if (vizinha < 1 || vizinha > totalPages || vizinha === page) continue;
      void queryClient.prefetchQuery(
        opcoesListaAfiliadosAdmin({ status, busca, page: vizinha, limit, ordenar, direcao }),
      );
    }
  }, [
    prefetchVizinhas,
    enabled,
    carregando,
    page,
    totalPages,
    status,
    busca,
    limit,
    ordenar,
    direcao,
    queryClient,
  ]);

  return consulta;
}

export function useCadastroAfiliado() {
  return useMutation({
    mutationFn: ({
      dados,
      documentos,
    }: {
      dados: CadastroAfiliadoInput;
      documentos: afiliadosApi.DocumentosCadastro;
    }) => afiliadosApi.cadastrarAfiliado(dados, documentos),
  });
}

export function useFichaAfiliadoAdmin(id: string | null) {
  return useQuery({
    queryKey: ['afiliados', 'ficha', id],
    queryFn: () => afiliadosApi.buscarFichaAfiliado(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useAbrirDocumentoAfiliado() {
  return useMutation({
    mutationFn: ({
      afiliadoId,
      documento,
      modo,
    }: {
      afiliadoId: string;
      documento: DocumentoAfiliado;
      modo: 'visualizar' | 'baixar';
    }) => afiliadosApi.abrirDocumentoAfiliado(afiliadoId, documento, modo),
  });
}

export function useCadastrarAfiliadoAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CadastroAfiliadoAdminInput) => afiliadosApi.cadastrarAfiliadoAdmin(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['afiliados'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] });
    },
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
    for (const page of [1, 2]) {
      void queryClient.prefetchQuery(
        opcoesListaAfiliadosAdmin({ page, limit: 20, ordenar: 'nome', direcao: 'asc' }),
      );
    }
  }, [queryClient]);
}
