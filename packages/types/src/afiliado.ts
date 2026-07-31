import { z } from 'zod';
import { cpfSchema } from './cpf';
import { statusAfiliadoSchema, tipoD8Schema } from './enums';

export const afiliadoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  nome: z.string().min(1),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos'),
  matricula: z.string().min(1),
  telefone: z.string().nullable(),
  categoria: tipoD8Schema.nullable().optional(),
  status: statusAfiliadoSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Afiliado = z.infer<typeof afiliadoSchema>;

export const cadastroAfiliadoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: cpfSchema,
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  telefone: z.string().min(8, 'Telefone inválido').optional(),
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});
export type CadastroAfiliadoInput = z.infer<typeof cadastroAfiliadoSchema>;

export const atualizarStatusAfiliadoSchema = z.object({
  status: statusAfiliadoSchema,
});
export type AtualizarStatusAfiliadoInput = z.infer<typeof atualizarStatusAfiliadoSchema>;

export const adminAtualizarSenhaAfiliadoSchema = z.object({
  novaSenha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});
export type AdminAtualizarSenhaAfiliadoInput = z.infer<typeof adminAtualizarSenhaAfiliadoSchema>;

export const filtroAfiliadosSchema = z.object({
  status: statusAfiliadoSchema.optional(),
  busca: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});
export type FiltroAfiliadosInput = z.infer<typeof filtroAfiliadosSchema>;

export const afiliadosPaginadosSchema = z.object({
  items: z.array(afiliadoSchema),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
export type AfiliadosPaginados = z.infer<typeof afiliadosPaginadosSchema>;
