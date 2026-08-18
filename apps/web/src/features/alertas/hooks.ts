import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Alerta, AtualizarAlertaInput, CriarAlertaInput } from '@sindprf/types';
import { useAuthStore } from '../auth/store';
import * as alertasApi from './api';

const CHAVE_ADMIN = ['alertas', 'admin'] as const;

function invalidarPublico(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['alertas', 'ativos'] });
}

function gravarLista(queryClient: ReturnType<typeof useQueryClient>, lista: Alerta[]) {
  queryClient.setQueryData([...CHAVE_ADMIN], lista);
}

/**
 * A resposta depende de quem está logado (alerta restrito a filiados), então o
 * usuário entra na chave: trocar de conta não pode reaproveitar cache alheio.
 */
export function useAlertasAtivos() {
  const userId = useAuthStore((estado) => estado.user?.id);

  return useQuery({
    queryKey: ['alertas', 'ativos', userId ?? 'anonimo'],
    queryFn: alertasApi.listarAlertasAtivos,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAlertasAdmin() {
  return useQuery({
    queryKey: [...CHAVE_ADMIN],
    queryFn: alertasApi.listarAlertasAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useAlertaAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['alertas', 'admin', id],
    queryFn: () => alertasApi.buscarAlertaAdmin(id!),
    enabled: Boolean(id),
  });
}

export function useCriarAlerta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarAlertaInput) => alertasApi.criarAlerta(input),
    onSuccess: (criado) => {
      const atual = queryClient.getQueryData<Alerta[]>([...CHAVE_ADMIN]) ?? [];
      gravarLista(queryClient, [criado, ...atual.filter((a) => a.id !== criado.id)]);
      invalidarPublico(queryClient);
    },
  });
}

export function useAtualizarAlerta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarAlertaInput & { id: string }) =>
      alertasApi.atualizarAlerta(id, input),
    onSuccess: (atualizado) => {
      queryClient.setQueryData(['alertas', 'admin', atualizado.id], atualizado);
      const atual = queryClient.getQueryData<Alerta[]>([...CHAVE_ADMIN]) ?? [];
      const existe = atual.some((a) => a.id === atualizado.id);
      gravarLista(
        queryClient,
        existe ? atual.map((a) => (a.id === atualizado.id ? atualizado : a)) : [atualizado, ...atual],
      );
      invalidarPublico(queryClient);
    },
  });
}

export function useRemoverAlerta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: alertasApi.removerAlerta,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [...CHAVE_ADMIN] });
      const anterior = queryClient.getQueryData<Alerta[]>([...CHAVE_ADMIN]);
      if (anterior) {
        gravarLista(
          queryClient,
          anterior.filter((a) => a.id !== id),
        );
      }
      queryClient.removeQueries({ queryKey: ['alertas', 'admin', id] });
      return { anterior };
    },
    onError: (_erro, _id, ctx) => {
      if (ctx?.anterior) gravarLista(queryClient, ctx.anterior);
    },
    onSettled: () => {
      invalidarPublico(queryClient);
    },
  });
}

export function useUploadImagemAlerta() {
  return useMutation({ mutationFn: alertasApi.uploadImagemAlerta });
}
