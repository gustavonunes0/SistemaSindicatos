import { z } from 'zod';

export const recursoDiretoriaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().nullable(),
  url: z.string().url(),
  ordem: z.number().int(),
  ativo: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type RecursoDiretoria = z.infer<typeof recursoDiretoriaSchema>;

export const criarRecursoDiretoriaSchema = z.object({
  titulo: z.string().min(2, 'Título deve ter no mínimo 2 caracteres'),
  descricao: z.string().max(2000).nullable().optional(),
  url: z.string().url('Informe uma URL válida'),
  ordem: z.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
});
export type CriarRecursoDiretoriaInput = z.infer<typeof criarRecursoDiretoriaSchema>;

export const atualizarRecursoDiretoriaSchema = criarRecursoDiretoriaSchema.partial();
export type AtualizarRecursoDiretoriaInput = z.infer<typeof atualizarRecursoDiretoriaSchema>;
