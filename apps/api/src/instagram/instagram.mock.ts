import type { InstagramPost } from '@sindprf/types';

// Feed fictício usado enquanto não há credenciais do Meta (INSTAGRAM_MOCK=true).
export const FEED_MOCK: InstagramPost[] = Array.from({ length: 6 }, (_, indice) => ({
  id: `mock-${indice + 1}`,
  mediaUrl: `https://picsum.photos/seed/sindprf-${indice + 1}/600/600`,
  permalink: 'https://www.instagram.com/sindprfce/',
  caption: `Post de exemplo ${indice + 1} — configure as credenciais do Instagram para ver o feed real.`,
  mediaType: 'IMAGE',
  publicadoEm: new Date(Date.now() - indice * 24 * 60 * 60 * 1000),
}));
