import { z } from 'zod';

// Campos de texto opcionais: "" (vindo de formulário) vira null.
const textoOpcional = z.preprocess(
  (valor) => (valor === '' ? null : valor),
  z.string().trim().nullable().optional(),
);

const urlOpcional = z.preprocess(
  (valor) => (valor === '' ? null : valor),
  z.string().url('Link inválido').nullable().optional(),
);

const dataOpcional = z.preprocess(
  (valor) => (valor === '' || valor === null ? null : valor),
  z.coerce.date().nullable().optional(),
);

export const convenioSchema = z.object({
  id: z.string(),
  nome: z.string(),
  categoria: z.string(),
  descricao: z.string(),
  logoUrl: z.string().nullable(),
  link: z.string().nullable(),
  contato: z.string().nullable(),
  vigenciaInicio: z.coerce.date().nullable(),
  vigenciaFim: z.coerce.date().nullable(),
  ativo: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Convenio = z.infer<typeof convenioSchema>;

export const criarConvenioSchema = z.object({
  nome: z.string().min(2, 'Informe o nome do parceiro'),
  categoria: z.string().min(2, 'Informe a categoria'),
  descricao: z.string().min(10, 'Descreva o benefício em ao menos 10 caracteres'),
  logoUrl: urlOpcional,
  link: urlOpcional,
  contato: textoOpcional,
  vigenciaInicio: dataOpcional,
  vigenciaFim: dataOpcional,
  ativo: z.boolean().default(true),
});
export type CriarConvenioInput = z.infer<typeof criarConvenioSchema>;

export const atualizarConvenioSchema = criarConvenioSchema.partial();
export type AtualizarConvenioInput = z.infer<typeof atualizarConvenioSchema>;

export const filtroConveniosSchema = z.object({
  categoria: z.string().optional(),
  busca: z.string().optional(),
});
export type FiltroConveniosInput = z.infer<typeof filtroConveniosSchema>;
