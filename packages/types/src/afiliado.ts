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
  nome: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: cpfSchema,
  matricula: z.string().trim().min(1, 'Matrícula é obrigatória'),
  telefone: z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor),
    z.string().min(8, 'Telefone inválido').optional(),
  ),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});
export type CadastroAfiliadoInput = z.infer<typeof cadastroAfiliadoSchema>;

/**
 * Cadastro feito pelo admin: mesmos dados de acesso, com status escolhido.
 * Padrão APROVADO — quem cadastra na secretaria já concluiu a filiação.
 */
export const cadastroAfiliadoAdminSchema = cadastroAfiliadoSchema.extend({
  status: statusAfiliadoSchema.default('APROVADO'),
});
export type CadastroAfiliadoAdminInput = z.infer<typeof cadastroAfiliadoAdminSchema>;

export const atualizarStatusAfiliadoSchema = z.object({
  status: statusAfiliadoSchema,
});
export type AtualizarStatusAfiliadoInput = z.infer<typeof atualizarStatusAfiliadoSchema>;

export const adminAtualizarSenhaAfiliadoSchema = z.object({
  novaSenha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});
export type AdminAtualizarSenhaAfiliadoInput = z.infer<typeof adminAtualizarSenhaAfiliadoSchema>;

/** Colunas que o banco sabe ordenar — a lista é paginada no servidor. */
export const ordenacaoAfiliadoSchema = z.enum(['nome', 'matricula', 'status', 'createdAt']);
export type OrdenacaoAfiliado = z.infer<typeof ordenacaoAfiliadoSchema>;

export const direcaoOrdenacaoSchema = z.enum(['asc', 'desc']);
export type DirecaoOrdenacao = z.infer<typeof direcaoOrdenacaoSchema>;

export const filtroAfiliadosSchema = z.object({
  status: statusAfiliadoSchema.optional(),
  busca: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  ordenar: ordenacaoAfiliadoSchema.default('nome'),
  direcao: direcaoOrdenacaoSchema.default('asc'),
});
export type FiltroAfiliadosInput = z.infer<typeof filtroAfiliadosSchema>;

export const afiliadosPaginadosSchema = z.object({
  items: z.array(afiliadoSchema),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
export type AfiliadosPaginados = z.infer<typeof afiliadosPaginadosSchema>;
