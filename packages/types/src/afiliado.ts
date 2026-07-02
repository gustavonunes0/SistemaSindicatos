import { z } from 'zod';
import { statusAfiliadoSchema } from './enums';

export const afiliadoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  nome: z.string().min(1),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos'),
  matricula: z.string().min(1),
  telefone: z.string().nullable(),
  status: statusAfiliadoSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Afiliado = z.infer<typeof afiliadoSchema>;
