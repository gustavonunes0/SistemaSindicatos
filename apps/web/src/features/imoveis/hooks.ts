import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AtualizarImovelInput,
  ConsultaDisponibilidadeInput,
  CriarImovelInput,
  CriarPeriodoInput,
  FiltroImoveisInput,
} from '@sindprf/types';
import * as imoveisApi from './api';

export function useImoveis(filtro: FiltroImoveisInput) {
  return useQuery({
    queryKey: ['imoveis', 'lista', filtro],
    queryFn: () => imoveisApi.listarImoveis(filtro),
    placeholderData: keepPreviousData,
  });
}

export function useImovel(id: string) {
  return useQuery({
    queryKey: ['imoveis', 'detalhe', id],
    queryFn: () => imoveisApi.buscarImovel(id),
  });
}

export function useDisponibilidadeImovel(id: string, consulta: ConsultaDisponibilidadeInput) {
  return useQuery({
    queryKey: [
      'imoveis',
      'disponibilidade',
      id,
      consulta.inicio.toISOString(),
      consulta.fim.toISOString(),
    ],
    queryFn: () => imoveisApi.consultarDisponibilidade(id, consulta),
    enabled: Boolean(id),
  });
}

export function useImoveisAdmin() {
  return useQuery({
    queryKey: ['imoveis', 'admin'],
    queryFn: imoveisApi.listarImoveisAdmin,
  });
}

export function useImovelAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['imoveis', 'admin', id],
    queryFn: () => imoveisApi.buscarImovelAdmin(id!),
    enabled: Boolean(id),
  });
}

export function usePeriodosAdmin(imovelId: string | undefined) {
  return useQuery({
    queryKey: ['imoveis', 'admin', imovelId, 'periodos'],
    queryFn: () => imoveisApi.listarPeriodosAdmin(imovelId!),
    enabled: Boolean(imovelId),
  });
}

function useInvalidarImoveis() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['imoveis'] });
}

export function useCriarImovel() {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: (input: CriarImovelInput) => imoveisApi.criarImovel(input),
    onSuccess: invalidar,
  });
}

export function useAtualizarImovel() {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarImovelInput & { id: string }) =>
      imoveisApi.atualizarImovel(id, input),
    onSuccess: invalidar,
  });
}

export function useRemoverImovel() {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: imoveisApi.removerImovel,
    onSuccess: invalidar,
  });
}

export function useUploadFotosImovel() {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: ({ id, arquivos }: { id: string; arquivos: File[] }) =>
      imoveisApi.uploadFotosImovel(id, arquivos),
    onSuccess: invalidar,
  });
}

export function useRemoverFotoImovel() {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: ({ imovelId, fotoId }: { imovelId: string; fotoId: string }) =>
      imoveisApi.removerFotoImovel(imovelId, fotoId),
    onSuccess: invalidar,
  });
}

export function useCriarPeriodoImovel() {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: ({ imovelId, ...input }: CriarPeriodoInput & { imovelId: string }) =>
      imoveisApi.criarPeriodoImovel(imovelId, input),
    onSuccess: invalidar,
  });
}

export function useRemoverPeriodoImovel() {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: ({ imovelId, periodoId }: { imovelId: string; periodoId: string }) =>
      imoveisApi.removerPeriodoImovel(imovelId, periodoId),
    onSuccess: invalidar,
  });
}
