import { instagramFeedSchema, type InstagramFeed } from '@sindprf/types';
import { api } from '../../lib/http';

export async function buscarFeed(): Promise<InstagramFeed> {
  const { data } = await api.get('/instagram/feed');
  return instagramFeedSchema.parse(data);
}
