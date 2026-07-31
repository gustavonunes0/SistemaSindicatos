import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAtualizarSenhaAfiliadoInput,
  FiltroAfiliadosInput,
  StatusAfiliado,
} from '@sindprf/types';
import * as afiliadosApi from './api';

export function useAfiliadosAdmin(filtro: Partial<FiltroAfiliadosInput> = {}) {
  const page = filtro.page ?? 1;
  const limit = filtro.limit ?? 20;
  const status = filtro.status;
  const busca = filtro.busca?.trim() || undefined;

  return useQuery({
    queryKey: ['afiliados', 'admin', { status: status ?? 'todos', busca: busca ?? '', page, limit }],
    queryFn: () =>
      afiliadosApi.listarAfiliadosAdmin({
        status,
        busca,
        page,
        limit,
      }),
  });
}

export function useAtualizarStatusAfiliado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAfiliado }) =>
      afiliadosApi.atualizarStatusAfiliado(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['afiliados'] });
    },
  });
}

export function useAtualizarSenhaAfiliadoAdmin() {
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & AdminAtualizarSenhaAfiliadoInput) =>
      afiliadosApi.atualizarSenhaAfiliadoAdmin(id, input),
  });
}
