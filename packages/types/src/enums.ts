import { z } from 'zod';

export const roleSchema = z.enum(['SUPERADMIN', 'ADMIN', 'AFILIADO']);
export type Role = z.infer<typeof roleSchema>;

export const statusAfiliadoSchema = z.enum(['PENDENTE', 'APROVADO', 'INATIVO']);
export type StatusAfiliado = z.infer<typeof statusAfiliadoSchema>;

export const tipoD8Schema = z.enum(['SERVIDOR', 'PENSIONISTA']);
export type TipoD8 = z.infer<typeof tipoD8Schema>;

export const tipoLinhaBalanceteSchema = z.enum([
  'ATIVO',
  'PASSIVO',
  'RECEITA',
  'DESPESA',
  'OUTRO',
]);
export type TipoLinhaBalancete = z.infer<typeof tipoLinhaBalanceteSchema>;

export const naturezaContaSchema = z.enum(['D', 'C']);
export type NaturezaConta = z.infer<typeof naturezaContaSchema>;

export const instituicaoFinanceiraSchema = z.enum(['SICOOB', 'SICREDI']);
export type InstituicaoFinanceira = z.infer<typeof instituicaoFinanceiraSchema>;

export const tipoDocumentoFinanceiroSchema = z.enum(['EXTRATO', 'FATURA']);
export type TipoDocumentoFinanceiro = z.infer<typeof tipoDocumentoFinanceiroSchema>;

export const tipoLancamentoFinanceiroSchema = z.enum(['CREDITO', 'DEBITO']);
export type TipoLancamentoFinanceiro = z.infer<typeof tipoLancamentoFinanceiroSchema>;

export const statusValidacaoSaldoSchema = z.enum(['VALIDO', 'DIVERGENTE', 'NAO_APLICAVEL']);
export type StatusValidacaoSaldo = z.infer<typeof statusValidacaoSaldoSchema>;
