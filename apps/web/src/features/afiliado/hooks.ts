import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CadastroAfiliadoInput, StatusAfiliado } from '@sindprf/types';
import * as afiliadosApi from './api';

export function useCadastroAfiliado() {
  return useMutation({
    mutationFn: (input: CadastroAfiliadoInput) => afiliadosApi.cadastrarAfiliado(input),
  });
}

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
