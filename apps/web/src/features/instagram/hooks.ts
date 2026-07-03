import { useQuery } from '@tanstack/react-query';
import { buscarFeed } from './api';

export function useInstagramFeed() {
  return useQuery({
    queryKey: ['instagram', 'feed'],
    queryFn: buscarFeed,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
