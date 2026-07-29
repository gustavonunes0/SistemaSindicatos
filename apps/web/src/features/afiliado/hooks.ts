import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAtualizarSenhaAfiliadoInput,
  StatusAfiliado,
} from '@sindprf/types';
import * as afiliadosApi from './api';

export function useAfiliadosAdmin(status?: StatusAfiliado) {
  return useQuery({
    queryKey: ['afiliados', 'admin', status ?? 'todos'],
    queryFn: () => afiliadosApi.listarAfiliadosAdmin(status),
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
