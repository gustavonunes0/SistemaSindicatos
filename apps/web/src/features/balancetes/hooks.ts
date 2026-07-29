import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as balancetesApi from './api';

export function useImportacoesBalancete() {
  return useQuery({
    queryKey: ['balancetes', 'lista'],
    queryFn: () => balancetesApi.listarImportacoesBalancete(),
  });
}

export function useImportacaoBalancete(id: string | undefined) {
  return useQuery({
    queryKey: ['balancetes', 'detalhe', id],
    queryFn: () => balancetesApi.detalheImportacaoBalancete(id!),
    enabled: Boolean(id),
  });
}

export function useImportarBalancete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { arquivo: File }) => balancetesApi.importarBalancete(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['balancetes'] });
    },
  });
}
