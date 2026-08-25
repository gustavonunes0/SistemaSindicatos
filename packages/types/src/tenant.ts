import { z } from 'zod';
import { linksCategoriaConvenioSchema } from './convenio';

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

/** Tokens de cor opcionais — sobrescrevem o tema CSS do tenant. */
export const coresBrandingSchema = z.object({
  primaria: z.string().min(1),
  primariaEscura: z.string().optional(),
  destaque: z.string().optional(),
  fundo: z.string().optional(),
  superficie: z.string().optional(),
  texto: z.string().optional(),
  textoSuave: z.string().optional(),
  borda: z.string().optional(),
});

export const tenantBrandingSchema = z.object({
  nome: z.string().min(1),
  nomeCompleto: z.string().min(1),
  logoUrl: z.string().min(1),
  /** Wordmark largo (header). Se omitido, usa logoUrl. */
  logoHeaderUrl: z.string().optional(),
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
  /** PDF do estatuto sindical (site institucional). */
  estatutoUrl: z.string().nullable().optional(),
  /** Rubrica desenhada acima do carimbo nas declarações em PDF. */
  assinaturaUrl: z.string().nullable().optional(),
  /** Link do fim da listagem pública de cada categoria de convênio. */
  linksCategoriaConvenio: linksCategoriaConvenioSchema.optional(),
  themeColor: z.string().optional(),
  cores: coresBrandingSchema.optional(),
  /** E-mail destino do formulário de contato (override). */
  contatoDestinoEmail: z.string().email().optional(),
  vapidSubject: z.string().optional(),
  diretoria: diretoriaBrandingSchema.optional(),
  filiacao: filiacaoBrandingSchema.optional(),
});

export type TenantBranding = z.infer<typeof tenantBrandingSchema>;
export type CoresBranding = z.infer<typeof coresBrandingSchema>;
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

/** Schemas do painel SUPERADMIN (Fase C). */
export const atualizarTenantPlataformaSchema = z.object({
  nome: z.string().min(2).max(200).optional(),
  ativo: z.boolean().optional(),
  timezone: z.string().min(1).max(80).optional(),
  branding: tenantBrandingSchema.optional(),
});
export type AtualizarTenantPlataformaInput = z.infer<typeof atualizarTenantPlataformaSchema>;

export const criarDominioPlataformaSchema = z.object({
  host: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .transform((h) => h.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]!.split(':')[0]!)
    .pipe(z.string().min(1).regex(/^[a-z0-9.-]+$/i, 'Host inválido')),
  primario: z.boolean().optional().default(false),
});
export type CriarDominioPlataformaInput = z.infer<typeof criarDominioPlataformaSchema>;

export const tenantAdminSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nome: z.string(),
  tipo: tenantTipoSchema,
  timezone: z.string(),
  ativo: z.boolean(),
  branding: tenantBrandingSchema.nullable(),
  domains: z.array(
    z.object({
      id: z.string(),
      host: z.string(),
      primario: z.boolean(),
    }),
  ),
  _count: z.object({
    users: z.number(),
    afiliados: z.number(),
  }),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type TenantAdmin = z.infer<typeof tenantAdminSchema>;
