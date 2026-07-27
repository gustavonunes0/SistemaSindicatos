import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'AFILIADO']);
export type Role = z.infer<typeof roleSchema>;

export const statusAfiliadoSchema = z.enum(['PENDENTE', 'APROVADO', 'INATIVO']);
export type StatusAfiliado = z.infer<typeof statusAfiliadoSchema>;

export const tipoD8Schema = z.enum(['SERVIDOR', 'PENSIONISTA']);
export type TipoD8 = z.infer<typeof tipoD8Schema>;
