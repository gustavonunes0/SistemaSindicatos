import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AtualizarNoticiaInput,
  CriarNoticiaInput,
  Noticia,
  NoticiaListagem,
} from '@sindprf/types';
import { useEffect, useMemo } from 'react';
import { gravarCacheNoticiasAdmin, lerCacheNoticiasAdmin } from '../admin/cache-admin';
import * as noticiasApi from './api';
import { gravarCacheNoticias, lerCacheNoticias, limparCacheNoticias } from './cache-local';

const STALE_PUBLICO = 10 * 60 * 1000;
const GC_PUBLICO = 30 * 60 * 1000;

function resumoDeConteudo(conteudo: string): string {
  return conteudo
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function listagemAdminDeNoticia(n: Noticia): NoticiaListagem {
  return {
    id: n.id,
    titulo: n.titulo,
    slug: n.slug,
    capaUrl: n.capaUrl,
    resumo: resumoDeConteudo(n.conteudo),
    status: n.status,
    publicadoEm: n.publicadoEm,
    autorId: n.autorId,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

function gravarListaAdmin(
  queryClient: ReturnType<typeof useQueryClient>,
  lista: NoticiaListagem[],
) {
  queryClient.setQueryData(['noticias', 'admin'], lista);
  gravarCacheNoticiasAdmin(lista);
}

function sincronizarAposMutacao(
  queryClient: ReturnType<typeof useQueryClient>,
  noticia?: Noticia,
) {
  if (noticia) {
    queryClient.setQueryData(['noticias', 'admin', noticia.id], noticia);
    queryClient.setQueryData(['noticias', 'detalhe', noticia.slug], noticia);
  }
  limparCacheNoticias();
  void queryClient.invalidateQueries({ queryKey: ['noticias', 'publicas'] });
  void queryClient.invalidateQueries({ queryKey: ['admin', 'metricas'] });
}

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
    // Pinta na hora com sessionStorage; updatedAt=0 força revalidação (Ctrl+Shift+R atualiza).
    initialData: cache,
    initialDataUpdatedAt: cache ? 0 : undefined,
    placeholderData: (anterior) => anterior ?? cache,
    refetchOnMount: 'always',
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
    initialDataUpdatedAt: cache ? 0 : undefined,
    placeholderData: (anterior) => anterior ?? cache,
    refetchOnMount: 'always',
  });
}

export function useNoticiaAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['noticias', 'admin', id],
    queryFn: () => noticiasApi.buscarNoticiaAdmin(id!),
    enabled: Boolean(id),
  });
}

export function useCriarNoticia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarNoticiaInput) => noticiasApi.criarNoticia(input),
    onSuccess: (criada) => {
      const item = listagemAdminDeNoticia(criada);
      const atual = queryClient.getQueryData<NoticiaListagem[]>(['noticias', 'admin']) ?? [];
      gravarListaAdmin(queryClient, [item, ...atual.filter((n) => n.id !== item.id)]);
      sincronizarAposMutacao(queryClient, criada);
    },
  });
}

export function useAtualizarNoticia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarNoticiaInput & { id: string }) =>
      noticiasApi.atualizarNoticia(id, input),
    onSuccess: (atualizada) => {
      const item = listagemAdminDeNoticia(atualizada);
      const atual = queryClient.getQueryData<NoticiaListagem[]>(['noticias', 'admin']) ?? [];
      const existe = atual.some((n) => n.id === item.id);
      gravarListaAdmin(
        queryClient,
        existe ? atual.map((n) => (n.id === item.id ? item : n)) : [item, ...atual],
      );
      sincronizarAposMutacao(queryClient, atualizada);
    },
  });
}

export function useRemoverNoticia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: noticiasApi.removerNoticia,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['noticias', 'admin'] });
      const anterior = queryClient.getQueryData<NoticiaListagem[]>(['noticias', 'admin']);
      if (anterior) {
        gravarListaAdmin(
          queryClient,
          anterior.filter((n) => n.id !== id),
        );
      }
      queryClient.removeQueries({ queryKey: ['noticias', 'admin', id] });
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
