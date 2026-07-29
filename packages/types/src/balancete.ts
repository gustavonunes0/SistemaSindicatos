import { z } from 'zod';
import {
  naturezaContaSchema,
  tipoLinhaBalanceteSchema,
  type NaturezaConta,
  type TipoLinhaBalancete,
} from './enums';

export { naturezaContaSchema, tipoLinhaBalanceteSchema, type NaturezaConta, type TipoLinhaBalancete };

export const importacaoBalanceteSchema = z.object({
  id: z.string(),
  competenciaAno: z.number().int(),
  competenciaMes: z.number().int().min(1).max(12),
  arquivoNome: z.string(),
  totalLinhas: z.number().int(),
  totalReceitas: z.coerce.number(),
  totalDespesas: z.coerce.number(),
  resultado: z.coerce.number(),
  createdAt: z.coerce.date(),
});
export type ImportacaoBalancete = z.infer<typeof importacaoBalanceteSchema>;

export const linhaBalanceteSchema = z.object({
  id: z.string(),
  importacaoId: z.string(),
  sequencia: z.number().int(),
  codigoConta: z.string(),
  descricao: z.string(),
  nivel: z.number().int(),
  tipo: tipoLinhaBalanceteSchema,
  natureza: naturezaContaSchema.nullable(),
  saldoAnterior: z.coerce.number(),
  debitos: z.coerce.number(),
  creditos: z.coerce.number(),
  saldoAtual: z.coerce.number(),
  movimento: z.coerce.number(),
  categoriaSlug: z.string().nullable(),
  categoriaNome: z.string().nullable(),
  ehFolha: z.boolean(),
});
export type LinhaBalancete = z.infer<typeof linhaBalanceteSchema>;

export const grupoBalanceteSchema = z.object({
  tipo: z.enum(['RECEITA', 'DESPESA']),
  categoriaSlug: z.string(),
  categoriaNome: z.string(),
  total: z.coerce.number(),
  linhas: z.array(linhaBalanceteSchema),
});
export type GrupoBalancete = z.infer<typeof grupoBalanceteSchema>;

export const importacaoBalanceteDetalheSchema = importacaoBalanceteSchema.extend({
  grupos: z.array(grupoBalanceteSchema),
});
export type ImportacaoBalanceteDetalhe = z.infer<typeof importacaoBalanceteDetalheSchema>;

export const importarBalanceteResultadoSchema = z.object({
  importacao: importacaoBalanceteSchema,
});
export type ImportarBalanceteResultado = z.infer<typeof importarBalanceteResultadoSchema>;

export const importarBalanceteCamposSchema = z.object({
  /** Texto extraído do PDF no cliente (pdfjs, linhas por Y). */
  texto: z.string().min(50, 'Texto do balancete inválido ou vazio'),
  arquivoNome: z.string().min(1).max(255).optional().default('balancete.pdf'),
});
export type ImportarBalanceteCampos = z.infer<typeof importarBalanceteCamposSchema>;
