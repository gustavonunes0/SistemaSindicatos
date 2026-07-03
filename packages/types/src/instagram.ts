import { z } from 'zod';

export const instagramPostSchema = z.object({
  id: z.string(),
  mediaUrl: z.string(),
  permalink: z.string(),
  caption: z.string().nullable(),
  mediaType: z.string(),
  publicadoEm: z.coerce.date(),
});
export type InstagramPost = z.infer<typeof instagramPostSchema>;

export const instagramFeedSchema = z.array(instagramPostSchema);
export type InstagramFeed = z.infer<typeof instagramFeedSchema>;
