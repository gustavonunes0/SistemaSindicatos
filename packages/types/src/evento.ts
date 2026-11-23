import { z } from 'zod';

export const fotoEventoSchema = z.object({
  id: z.string(),
  eventoId: z.string(),
  url: z.string(),
  nomeOriginal: z.string().nullable(),
  ordem: z.number().int(),
});
export type FotoEvento = z.infer<typeof fotoEventoSchema>;

export const eventoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().nullable(),
  local: z.string().nullable(),
  dataEvento: z.coerce.date().nullable(),
  ativo: z.boolean(),
  fotos: z.array(fotoEventoSchema).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Evento = z.infer<typeof eventoSchema>;

const dataEventoOpcional = z.preprocess((valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  return valor;
}, z.coerce.date().nullable().optional());

export const criarEventoSchema = z.object({
  titulo: z.string().trim().min(3, 'Informe o título do evento'),
  descricao: z
    .string()
    .trim()
    .max(5000, 'A descrição deve ter no máximo 5000 caracteres')
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : null)),
  local: z
    .string()
    .trim()
    .max(200, 'O local deve ter no máximo 200 caracteres')
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : null)),
  dataEvento: dataEventoOpcional,
  ativo: z.boolean().default(true),
});
export type CriarEventoInput = z.infer<typeof criarEventoSchema>;

export const atualizarEventoSchema = criarEventoSchema.partial();
export type AtualizarEventoInput = z.infer<typeof atualizarEventoSchema>;

export const filtroEventosSchema = z.object({
  busca: z.string().trim().max(120).optional(),
});
export type FiltroEventosInput = z.infer<typeof filtroEventosSchema>;
