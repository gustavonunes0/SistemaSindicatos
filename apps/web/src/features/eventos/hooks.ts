import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AtualizarEventoInput, CriarEventoInput, FiltroEventosInput } from '@sindprf/types';
import * as eventosApi from './api';

export function useEventos(filtro: FiltroEventosInput = {}) {
  return useQuery({
    queryKey: ['eventos', 'lista', filtro],
    queryFn: () => eventosApi.listarEventos(filtro),
    placeholderData: keepPreviousData,
  });
}

export function useEvento(id: string) {
  return useQuery({
    queryKey: ['eventos', 'detalhe', id],
    queryFn: () => eventosApi.buscarEvento(id),
    enabled: Boolean(id),
  });
}

export function useEventosAdmin() {
  return useQuery({
    queryKey: ['eventos', 'admin'],
    queryFn: eventosApi.listarEventosAdmin,
  });
}

export function useEventoAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['eventos', 'admin', id],
    queryFn: () => eventosApi.buscarEventoAdmin(id!),
    enabled: Boolean(id),
  });
}

function useInvalidarEventos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['eventos'] });
}

export function useCriarEvento() {
  const invalidar = useInvalidarEventos();
  return useMutation({
    mutationFn: (input: CriarEventoInput) => eventosApi.criarEvento(input),
    onSuccess: invalidar,
  });
}

export function useAtualizarEvento() {
  const invalidar = useInvalidarEventos();
  return useMutation({
    mutationFn: ({ id, ...input }: AtualizarEventoInput & { id: string }) =>
      eventosApi.atualizarEvento(id, input),
    onSuccess: invalidar,
  });
}

export function useRemoverEvento() {
  const invalidar = useInvalidarEventos();
  return useMutation({
    mutationFn: eventosApi.removerEvento,
    onSuccess: invalidar,
  });
}

export function useUploadFotosEvento() {
  const invalidar = useInvalidarEventos();
  return useMutation({
    mutationFn: ({ id, arquivos }: { id: string; arquivos: File[] }) =>
      eventosApi.uploadFotosEvento(id, arquivos),
    onSuccess: invalidar,
  });
}

export function useRemoverFotoEvento() {
  const invalidar = useInvalidarEventos();
  return useMutation({
    mutationFn: ({ eventoId, fotoId }: { eventoId: string; fotoId: string }) =>
      eventosApi.removerFotoEvento(eventoId, fotoId),
    onSuccess: invalidar,
  });
}
