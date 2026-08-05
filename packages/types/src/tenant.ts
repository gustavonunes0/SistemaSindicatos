import { z } from 'zod';

export const tenantTipoSchema = z.enum(['SINDICATO', 'PLATAFORMA']);
export type TenantTipo = z.infer<typeof tenantTipoSchema>;

export const membroDiretoriaSchema = z.object({
  cargo: z.string().optional(),
  nome: z.string().min(1),
});

export const blocoDiretoriaSchema = z.object({
  titulo: z.string().min(1),
  membros: z.array(membroDiretoriaSchema).min(1),
});

export const diretoriaBrandingSchema = z.object({
  mandato: z.string().min(1),
  chapa: z.string().min(1),
  historicoUrl: z.string().min(1),
  blocos: z.array(blocoDiretoriaSchema).min(1),
});

export const filiacaoItemSchema = z.object({
  rotulo: z.string().min(1),
  url: z.string().min(1),
});

export const filiacaoBrandingSchema = z.object({
  formularios: z.array(filiacaoItemSchema).default([]),
  documentos: z.array(z.string()).default([]),
});

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
  diretoria: diretoriaBrandingSchema.optional(),
  filiacao: filiacaoBrandingSchema.optional(),
});

export type TenantBranding = z.infer<typeof tenantBrandingSchema>;
export type DiretoriaBranding = z.infer<typeof diretoriaBrandingSchema>;
export type FiliacaoBranding = z.infer<typeof filiacaoBrandingSchema>;
export type BlocoDiretoria = z.infer<typeof blocoDiretoriaSchema>;
export type MembroDiretoria = z.infer<typeof membroDiretoriaSchema>;

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
