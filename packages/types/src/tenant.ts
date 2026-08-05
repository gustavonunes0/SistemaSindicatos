import { z } from 'zod';

export const tenantTipoSchema = z.enum(['SINDICATO', 'PLATAFORMA']);
export type TenantTipo = z.infer<typeof tenantTipoSchema>;

export const tenantBrandingSchema = z.object({
  nome: z.string().min(1),
  nomeCompleto: z.string().min(1),
  logoUrl: z.string().min(1),
  sede: z.object({
    endereco: z.string().min(1),
    cep: z.string().min(1),
  }),
  contato: z.object({
    telefones: z.array(z.string()).default([]),
    email: z.string().email(),
  }),
  reservaApartamentosUrl: z.string().url().nullable().optional(),
  regulamentoApartamentosUrl: z.string().nullable().optional(),
  themeColor: z.string().optional(),
  /** E-mail destino do formulário de contato (override). */
  contatoDestinoEmail: z.string().email().optional(),
  vapidSubject: z.string().optional(),
});

export type TenantBranding = z.infer<typeof tenantBrandingSchema>;

export const tenantPublicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nome: z.string(),
  tipo: tenantTipoSchema,
  timezone: z.string(),
  host: z.string(),
  branding: tenantBrandingSchema.nullable(),
});

export type TenantPublic = z.infer<typeof tenantPublicSchema>;
