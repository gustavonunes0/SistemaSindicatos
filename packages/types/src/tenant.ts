import { z } from 'zod';

export const tenantPublicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nome: z.string(),
  timezone: z.string(),
  host: z.string(),
  branding: z.unknown().nullable(),
});

export type TenantPublic = z.infer<typeof tenantPublicSchema>;
