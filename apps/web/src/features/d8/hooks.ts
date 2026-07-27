import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FiltroLinhasD8, TipoD8 } from '@sindprf/types';
import * as d8Api from './api';

export function useImportacoesD8() {
  return useQuery({
    queryKey: ['d8', 'lista'],
    queryFn: () => d8Api.listarImportacoesD8(),
  });
}

export function useImportacaoD8(id: string | undefined) {
  return useQuery({
    queryKey: ['d8', 'detalhe', id],
    queryFn: () => d8Api.detalheImportacaoD8(id!),
    enabled: Boolean(id),
  });
}

export function useLinhasD8(id: string | undefined, filtro: FiltroLinhasD8) {
  return useQuery({
    queryKey: ['d8', 'linhas', id, filtro],
    queryFn: () => d8Api.listarLinhasD8(id!, filtro),
    enabled: Boolean(id),
  });
}

export function useImportarD8() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { arquivo: File; tipo: TipoD8; substituirBase?: boolean }) =>
      d8Api.importarD8(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['d8'] });
      void queryClient.invalidateQueries({ queryKey: ['afiliados'] });
    },
  });
}
