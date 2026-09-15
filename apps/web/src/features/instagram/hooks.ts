import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DefinirDestaqueInstagramInput, InstagramPost } from '@sindprf/types';
import * as instagramApi from './api';

export function useInstagramFeed(apenasDestaques = false) {
  return useQuery({
    queryKey: ['instagram', 'feed', apenasDestaques ? 'destaques' : 'todos'],
    queryFn: () => instagramApi.buscarFeed(apenasDestaques),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useInstagramAdmin() {
  return useQuery({
    queryKey: ['instagram', 'admin'],
    queryFn: instagramApi.listarInstagramAdmin,
    staleTime: 60 * 1000,
  });
}

export function useDefinirDestaqueInstagram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: DefinirDestaqueInstagramInput & { id: string }) =>
      instagramApi.definirDestaqueInstagram(id, input),
    onSuccess: (post) => {
      queryClient.setQueryData<InstagramPost[]>(['instagram', 'admin'], (atual) =>
        (atual ?? []).map((item) => (item.id === post.id ? post : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ['instagram', 'feed'] });
    },
  });
}
