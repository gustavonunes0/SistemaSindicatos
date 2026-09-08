import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ImportacaoFinanceiraDetalheQuery,
  ImportarFinanceiroInput,
  PaginacaoFinanceiraQuery,
  PreviewImportacaoFinanceiraInput,
} from '@sindprf/types';
import * as financeiroApi from './api';

export function useContasFinanceiras() {
  return useQuery({
    queryKey: ['financeiro', 'contas'],
    queryFn: financeiroApi.listarContasFinanceiras,
  });
}

export function useImportacoesFinanceiras(
  query: PaginacaoFinanceiraQuery = { pagina: 1, limite: 100 },
) {
  return useQuery({
    queryKey: ['financeiro', 'importacoes', query],
    queryFn: () => financeiroApi.listarImportacoesFinanceiras(query),
  });
}

export function useImportacaoFinanceiraDetalhe(
  id: string | undefined,
  query: ImportacaoFinanceiraDetalheQuery,
) {
  return useQuery({
    queryKey: ['financeiro', 'importacao', id, query],
    queryFn: () => financeiroApi.detalharImportacaoFinanceira(id!, query),
    enabled: Boolean(id),
  });
}

export function usePreviewFinanceiro() {
  return useMutation({
    mutationFn: (input: PreviewImportacaoFinanceiraInput) =>
      financeiroApi.criarPreviewFinanceiro(input),
  });
}

export function useImportarDocumentoFinanceiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportarFinanceiroInput) =>
      financeiroApi.importarDocumentoFinanceiro(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financeiro', 'importacoes'] });
      void queryClient.invalidateQueries({ queryKey: ['financeiro', 'contas'] });
    },
  });
}
