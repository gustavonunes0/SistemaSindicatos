import { z } from 'zod';

export const estatutoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  nomeOriginal: z.string(),
  mimeType: z.string(),
  tamanhoBytes: z.number().int().nonnegative(),
  ativo: z.boolean(),
  ordem: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Estatuto = z.infer<typeof estatutoSchema>;

export const criarEstatutoSchema = z.object({
  titulo: z.string().trim().min(2, 'Título deve ter no mínimo 2 caracteres').max(200),
  ordem: z.coerce.number().int().min(0).default(0),
  ativo: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? true : v === true || v === 'true')),
});
export type CriarEstatutoInput = z.infer<typeof criarEstatutoSchema>;

export const atualizarEstatutoSchema = z.object({
  titulo: z.string().trim().min(2).max(200).optional(),
  ordem: z.coerce.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
});
export type AtualizarEstatutoInput = z.infer<typeof atualizarEstatutoSchema>;
