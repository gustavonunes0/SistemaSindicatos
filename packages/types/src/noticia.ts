import { z } from 'zod';

export const statusNoticiaSchema = z.enum(['RASCUNHO', 'PUBLICADO']);
export type StatusNoticia = z.infer<typeof statusNoticiaSchema>;

export const noticiaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  slug: z.string(),
  capaUrl: z.string().nullable(),
  conteudo: z.string(),
  status: statusNoticiaSchema,
  publicadoEm: z.coerce.date().nullable(),
  autorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Noticia = z.infer<typeof noticiaSchema>;

/** Listagem pública/admin — sem HTML completo. */
export const noticiaListagemSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  slug: z.string(),
  capaUrl: z.string().nullable(),
  resumo: z.string(),
  status: statusNoticiaSchema,
  publicadoEm: z.coerce.date().nullable(),
  autorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type NoticiaListagem = z.infer<typeof noticiaListagemSchema>;

export const criarNoticiaSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  capaUrl: z.string().nullable().optional(),
  status: statusNoticiaSchema.default('RASCUNHO'),
});
export type CriarNoticiaInput = z.infer<typeof criarNoticiaSchema>;

export const atualizarNoticiaSchema = criarNoticiaSchema.partial();
export type AtualizarNoticiaInput = z.infer<typeof atualizarNoticiaSchema>;

export const listarNoticiasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListarNoticiasQuery = z.infer<typeof listarNoticiasQuerySchema>;

export const noticiasPaginadasSchema = z.object({
  items: z.array(noticiaListagemSchema),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
export type NoticiasPaginadas = z.infer<typeof noticiasPaginadasSchema>;

export const uploadCapaResponseSchema = z.object({
  url: z.string(),
});
export type UploadCapaResponse = z.infer<typeof uploadCapaResponseSchema>;

export const adminMetricasSchema = z.object({
  noticiasTotal: z.number().int(),
  noticiasPublicadas: z.number().int(),
  conveniosTotal: z.number().int(),
  imoveisTotal: z.number().int(),
  solicitacoesTotal: z.number().int(),
  solicitacoesAbertas: z.number().int(),
});
export type AdminMetricas = z.infer<typeof adminMetricasSchema>;
