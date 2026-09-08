import { z } from 'zod';
import {
  instituicaoFinanceiraSchema,
  statusValidacaoSaldoSchema,
  tipoDocumentoFinanceiroSchema,
  tipoLancamentoFinanceiroSchema,
} from './enums';

export {
  instituicaoFinanceiraSchema,
  statusValidacaoSaldoSchema,
  tipoDocumentoFinanceiroSchema,
  tipoLancamentoFinanceiroSchema,
};

const identificadorContaSchema = z.string().trim().min(1).max(40);
const documentoSanitizadoSchema = z
  .string()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine((valor) => valor.length === 11 || valor.length === 14, 'CPF/CNPJ inválido');

export const itemPaginaFinanceiraSchema = z.object({
  texto: z.string().min(1),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
});
export type ItemPaginaFinanceira = z.infer<typeof itemPaginaFinanceiraSchema>;

export const paginaFinanceiraSchema = z.object({
  numero: z.number().int().positive(),
  texto: z.string().optional(),
  itens: z.array(itemPaginaFinanceiraSchema).optional(),
}).refine((pagina) => Boolean(pagina.texto?.trim()) || Boolean(pagina.itens?.length), {
  message: 'A página deve possuir texto ou itens estruturados',
});
export type PaginaFinanceira = z.infer<typeof paginaFinanceiraSchema>;

const conteudoDocumentoFinanceiroShape = {
  texto: z.string().min(20).optional(),
  paginas: z.array(paginaFinanceiraSchema).min(1).optional(),
};

export const conteudoDocumentoFinanceiroSchema = z.object(
  conteudoDocumentoFinanceiroShape,
).refine((conteudo) => Boolean(conteudo.texto?.trim()) || Boolean(conteudo.paginas?.length), {
  message: 'Informe o texto ou as páginas extraídas do documento',
});
export type ConteudoDocumentoFinanceiro = z.infer<typeof conteudoDocumentoFinanceiroSchema>;

export const contaFinanceiraSchema = z.object({
  id: z.string(),
  instituicao: instituicaoFinanceiraSchema,
  agencia: identificadorContaSchema,
  numero: identificadorContaSchema,
  nome: z.string(),
  titularNome: z.string().nullable(),
  titularDocumento: z.string().nullable(),
  ativo: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ContaFinanceira = z.infer<typeof contaFinanceiraSchema>;

export const cadastrarContaFinanceiraSchema = z.object({
  instituicao: instituicaoFinanceiraSchema,
  agencia: identificadorContaSchema,
  numero: identificadorContaSchema,
  nome: z.string().trim().min(2).max(120),
  titularNome: z.string().trim().min(2).max(160).optional(),
  titularDocumento: documentoSanitizadoSchema.optional(),
});
export type CadastrarContaFinanceira = z.infer<typeof cadastrarContaFinanceiraSchema>;

export const lancamentoFinanceiroPreviewSchema = z.object({
  sequencia: z.number().int().positive(),
  data: z.coerce.date(),
  descricao: z.string(),
  documento: z.string().nullable(),
  tipo: tipoLancamentoFinanceiroSchema,
  valor: z.number().positive(),
  saldoApos: z.number().nullable(),
  contraparteNome: z.string().nullable(),
  contraparteDocumento: z.string().nullable(),
  portadorNome: z.string().nullable(),
  cartaoFinal: z.string().nullable(),
  parcelaNumero: z.number().int().positive().nullable(),
  parcelaTotal: z.number().int().positive().nullable(),
  fingerprint: z.string().length(64),
});
export type LancamentoFinanceiroPreview = z.infer<typeof lancamentoFinanceiroPreviewSchema>;

export const validacaoSaldoFinanceiroSchema = z.object({
  status: statusValidacaoSaldoSchema,
  saldoInicial: z.number().nullable(),
  totalCreditos: z.number().nonnegative(),
  totalDebitos: z.number().nonnegative(),
  saldoCalculado: z.number().nullable(),
  saldoFinal: z.number().nullable(),
  diferenca: z.number().nullable(),
});
export type ValidacaoSaldoFinanceiro = z.infer<typeof validacaoSaldoFinanceiroSchema>;

export const previewImportacaoFinanceiraSchema = z.object({
  instituicao: instituicaoFinanceiraSchema,
  tipoDocumento: tipoDocumentoFinanceiroSchema,
  layout: z.string(),
  arquivoNome: z.string(),
  sha256: z.string().length(64),
  contaDetectada: cadastrarContaFinanceiraSchema.nullable(),
  competenciaAno: z.number().int().min(2000).max(2100),
  competenciaMes: z.number().int().min(1).max(12),
  periodoInicio: z.coerce.date(),
  periodoFim: z.coerce.date(),
  vencimento: z.coerce.date().nullable(),
  totalDocumento: z.number().nullable(),
  validacaoSaldo: validacaoSaldoFinanceiroSchema,
  lancamentos: z.array(lancamentoFinanceiroPreviewSchema),
  avisos: z.array(z.string()),
});
export type PreviewImportacaoFinanceira = z.infer<typeof previewImportacaoFinanceiraSchema>;

export const previewImportacaoFinanceiraInputSchema = z.object({
  ...conteudoDocumentoFinanceiroShape,
  arquivoNome: z.string().trim().min(1).max(255),
  instituicao: instituicaoFinanceiraSchema.optional(),
  tipoDocumento: tipoDocumentoFinanceiroSchema.optional(),
}).refine((conteudo) => Boolean(conteudo.texto?.trim()) || Boolean(conteudo.paginas?.length), {
  message: 'Informe o texto ou as páginas extraídas do documento',
});
export type PreviewImportacaoFinanceiraInput = z.infer<
  typeof previewImportacaoFinanceiraInputSchema
>;

export const importarFinanceiroInputSchema = z.object({
  ...conteudoDocumentoFinanceiroShape,
  arquivoNome: z.string().trim().min(1).max(255),
  instituicao: instituicaoFinanceiraSchema.optional(),
  tipoDocumento: tipoDocumentoFinanceiroSchema.optional(),
  sha256Esperado: z.string().length(64).optional(),
  contaId: z.string().optional(),
  conta: cadastrarContaFinanceiraSchema.optional(),
  substituirExistente: z.boolean().optional().default(false),
}).superRefine((input, ctx) => {
  if (!input.texto?.trim() && !input.paginas?.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o texto ou as páginas extraídas' });
  }
  if (input.contaId && input.conta) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe contaId ou conta, não ambos' });
  }
});
export type ImportarFinanceiroInput = z.infer<typeof importarFinanceiroInputSchema>;

export const importacaoFinanceiraSchema = z.object({
  id: z.string(),
  contaId: z.string(),
  instituicao: instituicaoFinanceiraSchema,
  tipoDocumento: tipoDocumentoFinanceiroSchema,
  layout: z.string(),
  arquivoNome: z.string(),
  sha256: z.string().length(64),
  competenciaAno: z.number().int().min(2000).max(2100),
  competenciaMes: z.number().int().min(1).max(12),
  periodoInicio: z.coerce.date(),
  periodoFim: z.coerce.date(),
  vencimento: z.coerce.date().nullable(),
  totalDocumento: z.number().nullable(),
  saldoInicial: z.number().nullable(),
  saldoFinal: z.number().nullable(),
  totalCreditos: z.number().nonnegative(),
  totalDebitos: z.number().nonnegative(),
  statusValidacaoSaldo: statusValidacaoSaldoSchema,
  totalLancamentos: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
});
export type ImportacaoFinanceira = z.infer<typeof importacaoFinanceiraSchema>;

export const lancamentoFinanceiroSchema = lancamentoFinanceiroPreviewSchema.extend({
  id: z.string(),
  importacaoId: z.string(),
  contaId: z.string(),
});
export type LancamentoFinanceiro = z.infer<typeof lancamentoFinanceiroSchema>;

export const paginacaoFinanceiraQuerySchema = z.object({
  pagina: z.coerce.number().int().positive().optional().default(1),
  limite: z.coerce.number().int().min(1).max(100).optional().default(20),
  contaId: z.string().optional(),
  tipoDocumento: tipoDocumentoFinanceiroSchema.optional(),
});
export type PaginacaoFinanceiraQuery = z.infer<typeof paginacaoFinanceiraQuerySchema>;

export const importacaoFinanceiraDetalheQuerySchema = z.object({
  pagina: z.coerce.number().int().positive().optional().default(1),
  limite: z.coerce.number().int().min(1).max(200).optional().default(50),
  busca: z.string().trim().max(200).optional(),
  tipo: tipoLancamentoFinanceiroSchema.optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});
export type ImportacaoFinanceiraDetalheQuery = z.infer<
  typeof importacaoFinanceiraDetalheQuerySchema
>;

export const listaImportacoesFinanceirasSchema = z.object({
  itens: z.array(importacaoFinanceiraSchema.extend({ conta: contaFinanceiraSchema })),
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type ListaImportacoesFinanceiras = z.infer<typeof listaImportacoesFinanceirasSchema>;

export const importacaoFinanceiraDetalheSchema = importacaoFinanceiraSchema.extend({
  conta: contaFinanceiraSchema,
  lancamentos: z.array(lancamentoFinanceiroSchema),
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  totalLancamentos: z.number().int().nonnegative(),
});
export type ImportacaoFinanceiraDetalhe = z.infer<typeof importacaoFinanceiraDetalheSchema>;
