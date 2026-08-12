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
import { gravarCacheConveniosAdmin, lerCacheConveniosAdmin } from '../admin/cache-admin';
import * as conveniosApi from './api';

function convenioDaListagem(item: ConvenioListagem): Convenio {
  return { ...item, textoComplementar: null };
}

/** Formato enxuto da tabela admin — espelha o payload de GET /convenios/admin. */
function listagemAdminDeConvenio(c: Convenio): ConvenioListagem {
  return {
    id: c.id,
    nome: c.nome,
    categoria: c.categoria,
    descricao: '',
    logoUrl: null,
    link: null,
    contato: null,
    vigenciaInicio: null,
    vigenciaFim: null,
    ativo: c.ativo,
    emiteDeclaracao: c.emiteDeclaracao,
    modeloDeclaracao: c.modeloDeclaracao,
    destinoDeclaracao: null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
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

function gravarListaAdmin(
  queryClient: ReturnType<typeof useQueryClient>,
  lista: ConvenioListagem[],
) {
  queryClient.setQueryData(['convenios', 'admin'], lista);
  gravarCacheConveniosAdmin(lista);
}

function sincronizarAposMutacao(
  queryClient: ReturnType<typeof useQueryClient>,
  convenio?: Convenio,
) {
  if (convenio) {
    queryClient.setQueryData(['convenios', 'admin', convenio.id], convenio);
    queryClient.setQueryData(['convenios', 'detalhe', convenio.id], convenio);
  }
  // Listagens públicas e métricas — em background, sem bloquear a UI.
  void queryClient.invalidateQueries({ queryKey: ['convenios', 'lista'] });
  void queryClient.invalidateQueries({ queryKey: ['convenios', 'categorias'] });
  void queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] });
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

export function useCriarConvenio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarConvenioInput) => conveniosApi.criarConvenio(input),
    onSuccess: (criado) => {
      const item = listagemAdminDeConvenio(criado);
      const atual = queryClient.getQueryData<ConvenioListagem[]>(['convenios', 'admin']) ?? [];
      gravarListaAdmin(queryClient, [item, ...atual.filter((c) => c.id !== item.id)]);
      sincronizarAposMutacao(queryClient, criado);
    },
  });
}

export function useAtualizarConvenio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarConvenioInput & { id: string }) =>
      conveniosApi.atualizarConvenio(id, input),
    onSuccess: (atualizado) => {
      const item = listagemAdminDeConvenio(atualizado);
      const atual = queryClient.getQueryData<ConvenioListagem[]>(['convenios', 'admin']) ?? [];
      const existe = atual.some((c) => c.id === item.id);
      gravarListaAdmin(
        queryClient,
        existe ? atual.map((c) => (c.id === item.id ? item : c)) : [item, ...atual],
      );
      sincronizarAposMutacao(queryClient, atualizado);
    },
  });
}

export function useRemoverConvenio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: conveniosApi.removerConvenio,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['convenios', 'admin'] });
      const anterior = queryClient.getQueryData<ConvenioListagem[]>(['convenios', 'admin']);
      if (anterior) {
        gravarListaAdmin(
          queryClient,
          anterior.filter((c) => c.id !== id),
        );
      }
      queryClient.removeQueries({ queryKey: ['convenios', 'admin', id] });
      queryClient.removeQueries({ queryKey: ['convenios', 'detalhe', id] });
      return { anterior };
    },
    onError: (_erro, _id, ctx) => {
      if (ctx?.anterior) gravarListaAdmin(queryClient, ctx.anterior);
    },
    onSettled: () => {
      sincronizarAposMutacao(queryClient);
    },
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
