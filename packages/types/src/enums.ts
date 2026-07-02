import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'AFILIADO']);
export type Role = z.infer<typeof roleSchema>;

export const statusAfiliadoSchema = z.enum(['PENDENTE', 'APROVADO', 'INATIVO']);
export type StatusAfiliado = z.infer<typeof statusAfiliadoSchema>;
