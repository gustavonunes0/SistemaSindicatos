import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'AFILIADO']);
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
