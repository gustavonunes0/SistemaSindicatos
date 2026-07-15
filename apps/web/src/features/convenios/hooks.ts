import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AtualizarConvenioInput,
  CriarConvenioInput,
  FiltroConveniosInput,
} from '@sindprf/types';
import * as conveniosApi from './api';

export function useConvenios(filtro: FiltroConveniosInput, enabled = true) {
  return useQuery({
    queryKey: ['convenios', 'lista', filtro],
    queryFn: () => conveniosApi.listarConvenios(filtro),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCategoriasConvenios(enabled = true) {
  return useQuery({
    queryKey: ['convenios', 'categorias'],
    queryFn: conveniosApi.listarCategorias,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useConvenio(id: string) {
  return useQuery({
    queryKey: ['convenios', 'detalhe', id],
    queryFn: () => conveniosApi.buscarConvenio(id),
  });
}

export function useConveniosAdmin() {
  return useQuery({
    queryKey: ['convenios', 'admin'],
    queryFn: conveniosApi.listarConveniosAdmin,
  });
}

export function useConvenioAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['convenios', 'admin', id],
    queryFn: () => conveniosApi.buscarConvenioAdmin(id!),
    enabled: Boolean(id),
  });
}

function useInvalidarConvenios() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['convenios'] });
}

export function useCriarConvenio() {
  const invalidar = useInvalidarConvenios();
  return useMutation({
    mutationFn: (input: CriarConvenioInput) => conveniosApi.criarConvenio(input),
    onSuccess: invalidar,
  });
}

export function useAtualizarConvenio() {
  const invalidar = useInvalidarConvenios();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarConvenioInput & { id: string }) =>
      conveniosApi.atualizarConvenio(id, input),
    onSuccess: invalidar,
  });
}

export function useRemoverConvenio() {
  const invalidar = useInvalidarConvenios();
  return useMutation({
    mutationFn: conveniosApi.removerConvenio,
    onSuccess: invalidar,
  });
}
