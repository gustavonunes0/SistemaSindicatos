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
  documentosCount: z.number().int().nonnegative().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Afiliado = z.infer<typeof afiliadoSchema>;

export const tipoDocumentoFiliacaoSchema = z.enum([
  'IDENTIDADE_CPF',
  'COMPROVANTE_ENDERECO',
  'CONTRACHEQUE',
  'FOTO_3X4',
]);
export type TipoDocumentoFiliacao = z.infer<typeof tipoDocumentoFiliacaoSchema>;

export const TIPO_DOCUMENTO_FILIACAO_ROTULO: Record<TipoDocumentoFiliacao, string> = {
  IDENTIDADE_CPF: 'Carteira funcional ou RG e CPF',
  COMPROVANTE_ENDERECO: 'Comprovante de endereço',
  CONTRACHEQUE: 'Último contracheque',
  FOTO_3X4: 'Foto 3×4',
};

export const documentoAfiliadoSchema = z.object({
  id: z.string(),
  tipo: tipoDocumentoFiliacaoSchema,
  nomeOriginal: z.string(),
  mimeType: z.string(),
  tamanhoBytes: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
});
export type DocumentoAfiliado = z.infer<typeof documentoAfiliadoSchema>;

export const estadoCivilSchema = z.enum([
  'SOLTEIRO',
  'CASADO',
  'UNIAO_ESTAVEL',
  'SEPARADO',
  'DIVORCIADO',
  'VIUVO',
]);
export type EstadoCivil = z.infer<typeof estadoCivilSchema>;

export const ESTADO_CIVIL_ROTULO: Record<EstadoCivil, string> = {
  SOLTEIRO: 'Solteiro(a)',
  CASADO: 'Casado(a)',
  UNIAO_ESTAVEL: 'União estável',
  SEPARADO: 'Separado(a)',
  DIVORCIADO: 'Divorciado(a)',
  VIUVO: 'Viúvo(a)',
};

export const ufSchema = z.enum([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);
export type Uf = z.infer<typeof ufSchema>;

/** Campo de texto que o formulário envia como "" quando não preenchido. */
const textoOpcional = z.preprocess(
  (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor),
  z.string().trim().max(160).optional(),
);

const emailOpcional = z.preprocess(
  (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor),
  z.string().trim().toLowerCase().email('E-mail inválido').optional(),
);

function telefone(mensagem: string) {
  return z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\D/g, ''))
    .pipe(z.string().min(10, mensagem).max(11, mensagem));
}

const telefoneOpcional = z.preprocess(
  (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor),
  telefone('Informe DDD e número').optional(),
);

function dataObrigatoria(mensagem: string) {
  return z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor),
    z.coerce.date({ required_error: mensagem, invalid_type_error: mensagem }),
  );
}

export const dependenteAfiliadoSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome do dependente').max(160),
  parentesco: z.string().trim().min(2, 'Informe o grau de parentesco').max(60),
  dataNascimento: dataObrigatoria('Informe a data de nascimento'),
});
export type DependenteAfiliadoInput = z.infer<typeof dependenteAfiliadoSchema>;

/** Dados presentes nas fichas de servidor e pensionista. */
const fichaFiliacaoComumSchema = z.object({
  dataNascimento: dataObrigatoria('Informe a data de nascimento'),
  rg: z.string().trim().min(3, 'Informe o RG').max(30),
  orgaoExpedidor: z.string().trim().min(2, 'Informe o órgão expedidor').max(40),
  naturalidade: z.string().trim().min(2, 'Informe a naturalidade').max(120),
  estadoCivil: z.enum(estadoCivilSchema.options, {
    errorMap: () => ({ message: 'Selecione o estado civil' }),
  }),
  nomeMae: z.string().trim().min(3, 'Informe o nome da mãe').max(160),
  nomePai: textoOpcional,
  conjuge: textoOpcional,

  endereco: z.string().trim().min(5, 'Informe o endereço').max(200),
  complemento: textoOpcional,
  bairro: z.string().trim().min(2, 'Informe o bairro').max(120),
  cidade: z.string().trim().min(2, 'Informe a cidade').max(120),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(ufSchema.options, { errorMap: () => ({ message: 'Selecione a UF' }) })),
  cep: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos')),

  celular: telefone('Informe DDD e número do celular'),
  celular2: telefoneOpcional,
  emailFuncional: emailOpcional,
});

const camposFuncionaisSchema = z.object({
  lotacaoSiape: textoOpcional,
  lotacaoAtividade: textoOpcional,
  dataAdmissao: z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor),
    z.coerce.date().optional(),
  ),
  instituidorPensao: textoOpcional,
});

const acessoAfiliadoSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: cpfSchema,
  matricula: z.string().trim().min(1, 'Matrícula é obrigatória'),
  telefone: telefoneOpcional,
  email: z.string().trim().toLowerCase().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

const dependentesSchema = z
  .array(dependenteAfiliadoSchema)
  .max(10, 'Informe no máximo 10 dependentes')
  .default([]);

export const cadastroAfiliadoSchema = acessoAfiliadoSchema
  .merge(fichaFiliacaoComumSchema)
  .merge(camposFuncionaisSchema)
  .extend({
    categoria: tipoD8Schema,
    dependentes: dependentesSchema,
    // O sindicato precisa guardar o momento do aceite: é ele que autoriza o
    // desconto da mensalidade em folha.
    aceiteEstatuto: z
      .boolean()
      .refine((valor) => valor, 'É preciso aceitar as condições do estatuto'),
  })
  .superRefine((dados, contexto) => {
    if (dados.categoria === 'SERVIDOR') {
      if (!dados.lotacaoSiape) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lotacaoSiape'],
          message: 'Informe a lotação SIAPE',
        });
      }
      if (!dados.dataAdmissao) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataAdmissao'],
          message: 'Informe a data de admissão',
        });
      }
    }

    if (dados.categoria === 'PENSIONISTA' && !dados.instituidorPensao) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['instituidorPensao'],
        message: 'Informe o instituidor da pensão',
      });
    }
  });
export type CadastroAfiliadoInput = z.infer<typeof cadastroAfiliadoSchema>;

/**
 * Cadastro feito pelo admin: mesmos dados de acesso, com status escolhido.
 * Padrão APROVADO — quem cadastra na secretaria já concluiu a filiação, e a
 * ficha completa pode ser preenchida depois.
 */
export const cadastroAfiliadoAdminSchema = acessoAfiliadoSchema
  .merge(fichaFiliacaoComumSchema.partial())
  .merge(camposFuncionaisSchema.partial())
  .extend({
    categoria: tipoD8Schema.optional(),
    dependentes: dependentesSchema,
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

export const dependenteAfiliadoRespostaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  parentesco: z.string(),
  dataNascimento: z.coerce.date(),
});
export type DependenteAfiliado = z.infer<typeof dependenteAfiliadoRespostaSchema>;

/** Ficha completa — usada na análise da solicitação pelo admin. */
export const afiliadoFichaSchema = afiliadoSchema.extend({
  email: z.string(),
  emailFuncional: z.string().nullable(),
  celular: z.string().nullable(),
  celular2: z.string().nullable(),
  dataNascimento: z.coerce.date().nullable(),
  rg: z.string().nullable(),
  orgaoExpedidor: z.string().nullable(),
  naturalidade: z.string().nullable(),
  estadoCivil: estadoCivilSchema.nullable(),
  nomeMae: z.string().nullable(),
  nomePai: z.string().nullable(),
  conjuge: z.string().nullable(),
  endereco: z.string().nullable(),
  complemento: z.string().nullable(),
  bairro: z.string().nullable(),
  cidade: z.string().nullable(),
  uf: z.string().nullable(),
  cep: z.string().nullable(),
  lotacaoSiape: z.string().nullable(),
  lotacaoAtividade: z.string().nullable(),
  instituidorPensao: z.string().nullable(),
  dataAdmissao: z.coerce.date().nullable(),
  aceiteEstatutoEm: z.coerce.date().nullable(),
  dependentes: z.array(dependenteAfiliadoRespostaSchema),
  documentos: z.array(documentoAfiliadoSchema),
});
export type AfiliadoFicha = z.infer<typeof afiliadoFichaSchema>;

export const afiliadosPaginadosSchema = z.object({
  items: z.array(afiliadoSchema),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
export type AfiliadosPaginados = z.infer<typeof afiliadosPaginadosSchema>;
