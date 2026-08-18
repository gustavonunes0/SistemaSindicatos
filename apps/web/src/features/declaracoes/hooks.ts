import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DeclaracaoEmitida, ListarDeclaracoesQuery } from '@sindprf/types';
import { useTenantStore } from '../tenant/store';
import * as declaracoesApi from './api';

const CHAVE_ADMIN = ['declaracoes', 'admin'] as const;

/** A rubrica vive no branding, que mora no store de tenant e não no React Query. */
function recarregarMarca() {
  void useTenantStore.getState().carregar();
}

function trocarNaLista(
  queryClient: ReturnType<typeof useQueryClient>,
  atualizada: DeclaracaoEmitida,
) {
  queryClient.setQueriesData<DeclaracaoEmitida[]>(
    { queryKey: [...CHAVE_ADMIN] },
    (atual) =>
      atual?.map((declaracao) =>
        declaracao.id === atualizada.id ? atualizada : declaracao,
      ),
  );
}

export function useDeclaracoesAdmin(query: ListarDeclaracoesQuery) {
  return useQuery({
    queryKey: [...CHAVE_ADMIN, query.status ?? 'todos', query.busca ?? ''],
    queryFn: () => declaracoesApi.listarDeclaracoesAdmin(query),
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useMinhasDeclaracoes() {
  return useQuery({
    queryKey: ['declaracoes', 'minhas'],
    queryFn: declaracoesApi.listarMinhasDeclaracoes,
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useBaixarDeclaracao() {
  return useMutation({
    mutationFn: ({ id, versao }: { id: string; versao: 'original' | 'assinada' }) =>
      declaracoesApi.baixarDeclaracao(id, versao),
  });
}

export function useEnviarDeclaracaoAssinada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) =>
      declaracoesApi.enviarDeclaracaoAssinada(id, arquivo),
    onSuccess: (atualizada) => {
      trocarNaLista(queryClient, atualizada);
      void queryClient.invalidateQueries({ queryKey: [...CHAVE_ADMIN] });
      void queryClient.invalidateQueries({ queryKey: ['declaracoes', 'minhas'] });
    },
  });
}

export function useRemoverDeclaracaoAssinada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declaracoesApi.removerDeclaracaoAssinada,
    onSuccess: (atualizada) => {
      trocarNaLista(queryClient, atualizada);
      void queryClient.invalidateQueries({ queryKey: [...CHAVE_ADMIN] });
      void queryClient.invalidateQueries({ queryKey: ['declaracoes', 'minhas'] });
    },
  });
}

export function useEnviarRubrica() {
  return useMutation({
    mutationFn: declaracoesApi.enviarRubrica,
    onSuccess: recarregarMarca,
  });
}

export function useRemoverRubrica() {
  return useMutation({
    mutationFn: declaracoesApi.removerRubrica,
    onSuccess: recarregarMarca,
  });
}
