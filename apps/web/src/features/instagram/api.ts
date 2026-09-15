import {
  instagramFeedSchema,
  instagramPostSchema,
  type DefinirDestaqueInstagramInput,
  type InstagramFeed,
  type InstagramPost,
} from '@sindprf/types';
import { api } from '../../lib/http';

export async function buscarFeed(apenasDestaques = false): Promise<InstagramFeed> {
  const { data } = await api.get('/instagram/feed', {
    params: apenasDestaques ? { destaques: '1' } : undefined,
  });
  return instagramFeedSchema.parse(data);
}

export async function listarInstagramAdmin(): Promise<InstagramFeed> {
  const { data } = await api.get('/instagram/admin');
  return instagramFeedSchema.parse(data);
}

export async function definirDestaqueInstagram(
  id: string,
  input: DefinirDestaqueInstagramInput,
): Promise<InstagramPost> {
  const { data } = await api.patch(`/instagram/${id}/destaque`, input);
  return instagramPostSchema.parse(data);
}
