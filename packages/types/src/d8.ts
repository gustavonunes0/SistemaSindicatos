import { z } from 'zod';
import { statusAfiliadoSchema, tipoD8Schema, type TipoD8 } from './enums';

export { tipoD8Schema, type TipoD8 };

export const filtroLinhasD8Schema = z.enum(['todos', 'semCadastro']);
export type FiltroLinhasD8 = z.infer<typeof filtroLinhasD8Schema>;

export const importacaoD8Schema = z.object({
  id: z.string(),
  competenciaAno: z.number().int(),
  competenciaMes: z.number().int().min(1).max(12),
  tipo: tipoD8Schema,
  arquivoNome: z.string(),
  totalLinhas: z.number().int(),
  totalValor: z.coerce.number(),
  createdAt: z.coerce.date(),
});
export type ImportacaoD8 = z.infer<typeof importacaoD8Schema>;

export const linhaD8Schema = z.object({
  id: z.string(),
  importacaoId: z.string(),
  sequencia: z.number().int(),
  matricula: z.string(),
  nome: z.string(),
  cpf: z.string(),
  descricao: z.string(),
  valor: z.coerce.number(),
  afiliadoId: z.string().nullable(),
});
export type LinhaD8 = z.infer<typeof linhaD8Schema>;

export const afiliadoD8ResumoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  cpf: z.string(),
  matricula: z.string(),
  status: statusAfiliadoSchema,
  categoria: tipoD8Schema.nullable(),
});
export type AfiliadoD8Resumo = z.infer<typeof afiliadoD8ResumoSchema>;

export const importacaoD8ResumoSchema = z.object({
  totalLinhas: z.number().int(),
  totalValor: z.coerce.number(),
  vinculados: z.number().int(),
  semCadastro: z.number().int(),
  criados: z.number().int(),
  inativados: z.number().int(),
  semDesconto: z.number().int(),
});
export type ImportacaoD8Resumo = z.infer<typeof importacaoD8ResumoSchema>;

export const importacaoD8DetalheSchema = importacaoD8Schema.extend({
  resumo: importacaoD8ResumoSchema,
  semDesconto: z.array(afiliadoD8ResumoSchema),
});
export type ImportacaoD8Detalhe = z.infer<typeof importacaoD8DetalheSchema>;

export const importarD8ResultadoSchema = z.object({
  importacao: importacaoD8Schema,
  resumo: importacaoD8ResumoSchema,
  senhaTemporariaUsada: z.boolean(),
});
export type ImportarD8Resultado = z.infer<typeof importarD8ResultadoSchema>;

export const importarD8CamposSchema = z.object({
  tipo: tipoD8Schema,
  substituirBase: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((valor) => {
      if (valor === undefined) return false;
      if (typeof valor === 'boolean') return valor;
      return valor === 'true' || valor === '1';
    }),
  /** Texto extraído do PDF no cliente (pdfjs). */
  texto: z.string().min(20, 'Texto do D8 inválido ou vazio'),
  arquivoNome: z.string().min(1).max(255).optional().default('d8.pdf'),
});
export type ImportarD8Campos = z.infer<typeof importarD8CamposSchema>;

export const listarLinhasD8QuerySchema = z.object({
  filtro: filtroLinhasD8Schema.optional().default('todos'),
});
export type ListarLinhasD8Query = z.infer<typeof listarLinhasD8QuerySchema>;
