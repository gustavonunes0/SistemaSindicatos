import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListarAcoesJuridicasQuery } from '@sindprf/types';
import * as juridicoApi from './api';

const CHAVE_ACOES_ADMIN = ['juridico', 'acoes', 'admin'] as const;
const CHAVE_IMPORTACOES = ['juridico', 'importacoes'] as const;

export function useAcoesJuridicasAdmin(query: ListarAcoesJuridicasQuery) {
  return useQuery({
    queryKey: [...CHAVE_ACOES_ADMIN, query.busca ?? ''],
    queryFn: () => juridicoApi.listarAcoesJuridicasAdmin(query),
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useImportacoesJuridico() {
  return useQuery({
    queryKey: [...CHAVE_IMPORTACOES],
    queryFn: juridicoApi.listarImportacoesJuridico,
    staleTime: 60 * 1000,
  });
}

export function useMinhasAcoesJuridicas() {
  return useQuery({
    queryKey: ['juridico', 'minhas'],
    queryFn: juridicoApi.listarMinhasAcoesJuridicas,
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useImportarPlanilhaJuridico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: juridicoApi.importarPlanilhaJuridico,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...CHAVE_ACOES_ADMIN] });
      void queryClient.invalidateQueries({ queryKey: [...CHAVE_IMPORTACOES] });
      void queryClient.invalidateQueries({ queryKey: ['juridico', 'minhas'] });
    },
  });
}
