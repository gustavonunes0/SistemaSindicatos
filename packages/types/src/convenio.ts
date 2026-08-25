import { z } from 'zod';
import { cpfSchema } from './cpf';

// Campos de texto opcionais: "" (vindo de formulário) vira null.
const textoOpcional = z.preprocess(
  (valor) => (valor === '' ? null : valor),
  z.string().trim().nullable().optional(),
);

const urlOpcional = z.preprocess(
  (valor) => (valor === '' ? null : valor),
  z.string().url('Link inválido').nullable().optional(),
);

// Imagem guardada pelo próprio sistema: o upload devolve um caminho relativo
// (`/uploads/...`), que não passa em `z.string().url()`.
const arquivoOpcional = z.preprocess(
  (valor) => (valor === '' ? null : valor),
  z
    .string()
    .trim()
    .refine(
      (valor) => valor.startsWith('/') || z.string().url().safeParse(valor).success,
      { message: 'Imagem inválida' },
    )
    .nullable()
    .optional(),
);

const dataOpcional = z.preprocess(
  (valor) => (valor === '' || valor === null ? null : valor),
  z.coerce.date().nullable().optional(),
);

export const modeloDeclaracaoSchema = z.enum([
  'FILIADO',
  'DEPENDENTE',
  'AUTORIZACAO_HOSPEDAGEM',
]);
export type ModeloDeclaracao = z.infer<typeof modeloDeclaracaoSchema>;

export const MODELO_DECLARACAO_ROTULO: Record<ModeloDeclaracao, string> = {
  FILIADO: 'Declaração de filiação',
  DEPENDENTE: 'Declaração de dependente',
  AUTORIZACAO_HOSPEDAGEM: 'Autorização de hospedagem',
};

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
  emiteDeclaracao: z.boolean(),
  modeloDeclaracao: modeloDeclaracaoSchema.nullable(),
  destinoDeclaracao: z.string().nullable(),
  textoComplementar: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Convenio = z.infer<typeof convenioSchema>;

/** Listagem — sem textoComplementar; descricao pode vir vazia no admin. */
export const convenioListagemSchema = convenioSchema
  .omit({ textoComplementar: true })
  .extend({
    descricao: z.string().default(''),
  });
export type ConvenioListagem = z.infer<typeof convenioListagemSchema>;

const convenioCamposSchema = z.object({
  nome: z.string().min(2, 'Informe o nome do parceiro'),
  categoria: z.string().min(2, 'Informe a categoria'),
  descricao: z.string().min(10, 'Descreva o benefício em ao menos 10 caracteres'),
  logoUrl: arquivoOpcional,
  link: urlOpcional,
  contato: textoOpcional,
  vigenciaInicio: dataOpcional,
  vigenciaFim: dataOpcional,
  ativo: z.boolean().default(true),
  emiteDeclaracao: z.boolean().default(false),
  modeloDeclaracao: z.preprocess(
    (valor) => (valor === '' || valor === null ? null : valor),
    modeloDeclaracaoSchema.nullable().optional(),
  ),
  destinoDeclaracao: textoOpcional,
  textoComplementar: textoOpcional,
});

function validarCamposDeclaracao(
  dados: {
    emiteDeclaracao?: boolean;
    modeloDeclaracao?: ModeloDeclaracao | null;
    destinoDeclaracao?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  if (!dados.emiteDeclaracao) return;
  if (!dados.modeloDeclaracao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione o modelo da declaração',
      path: ['modeloDeclaracao'],
    });
  }
  if (!dados.destinoDeclaracao?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o destino (parceiro) da declaração',
      path: ['destinoDeclaracao'],
    });
  }
}

export const criarConvenioSchema = convenioCamposSchema.superRefine(validarCamposDeclaracao);
export type CriarConvenioInput = z.infer<typeof criarConvenioSchema>;

export const atualizarConvenioSchema = convenioCamposSchema
  .partial()
  .superRefine(validarCamposDeclaracao);
export type AtualizarConvenioInput = z.infer<typeof atualizarConvenioSchema>;

export const filtroConveniosSchema = z.object({
  categoria: z.string().optional(),
  busca: z.string().optional(),
});
export type FiltroConveniosInput = z.infer<typeof filtroConveniosSchema>;

const dataIso = z.preprocess(
  (valor) => (valor === '' || valor === null || valor === undefined ? undefined : valor),
  z.coerce.date().optional(),
);

export const emitirDeclaracaoSchema = z
  .object({
    dependenteNome: z.preprocess(
      (valor) => (valor === '' || valor === null ? undefined : valor),
      z.string().trim().min(3, 'Informe o nome do dependente').max(120).optional(),
    ),
    dependenteCpf: z.preprocess(
      (valor) => (valor === '' || valor === null ? undefined : valor),
      cpfSchema.optional(),
    ),
    periodoInicio: dataIso,
    periodoFim: dataIso,
    /** Admin sem vínculo de afiliado: dados do beneficiário (ele próprio). */
    beneficiarioNome: z.preprocess(
      (valor) => (valor === '' || valor === null ? undefined : valor),
      z.string().trim().min(3, 'Informe o nome').max(120).optional(),
    ),
    beneficiarioCpf: z.preprocess(
      (valor) => (valor === '' || valor === null ? undefined : valor),
      cpfSchema.optional(),
    ),
  })
  .superRefine((dados, ctx) => {
    if (dados.periodoInicio && dados.periodoFim && dados.periodoFim < dados.periodoInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A data final deve ser após a inicial',
        path: ['periodoFim'],
      });
    }
  });
export type EmitirDeclaracaoInput = z.infer<typeof emitirDeclaracaoSchema>;

export const declaracaoValidacaoSchema = z.object({
  valida: z.literal(true),
  codigo: z.string(),
  modelo: modeloDeclaracaoSchema,
  modeloRotulo: z.string(),
  convenioNome: z.string(),
  destino: z.string(),
  afiliadoNome: z.string(),
  afiliadoCpfMascarado: z.string(),
  afiliadoStatus: z.enum(['PENDENTE', 'APROVADO', 'INATIVO']).nullable(),
  afiliadoAtivo: z.boolean(),
  dependenteNome: z.string().nullable(),
  dependenteCpfMascarado: z.string().nullable(),
  periodoInicio: z.coerce.date().nullable(),
  periodoFim: z.coerce.date().nullable(),
  emitidaEm: z.coerce.date(),
  sindicatoNome: z.string(),
});
export type DeclaracaoValidacao = z.infer<typeof declaracaoValidacaoSchema>;

export const declaracaoInvalidaSchema = z.object({
  valida: z.literal(false),
  motivo: z.string(),
});
export type DeclaracaoInvalida = z.infer<typeof declaracaoInvalidaSchema>;

export const declaracaoValidacaoRespostaSchema = z.discriminatedUnion('valida', [
  declaracaoValidacaoSchema,
  declaracaoInvalidaSchema,
]);
export type DeclaracaoValidacaoResposta = z.infer<typeof declaracaoValidacaoRespostaSchema>;

// ---------------------------------------------------------------------------
// Declarações emitidas: fila de assinatura e acompanhamento pelo filiado
// ---------------------------------------------------------------------------

export const statusDeclaracaoSchema = z.enum(['PENDENTE', 'ASSINADA']);
export type StatusDeclaracao = z.infer<typeof statusDeclaracaoSchema>;

export const STATUS_DECLARACAO_ROTULO: Record<StatusDeclaracao, string> = {
  PENDENTE: 'Aguardando assinatura',
  ASSINADA: 'Assinada',
};

/** Linha da fila do admin e do histórico do filiado. */
export const declaracaoEmitidaSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  modelo: modeloDeclaracaoSchema,
  destino: z.string(),
  convenioNome: z.string(),
  afiliadoNome: z.string(),
  afiliadoMatricula: z.string().nullable(),
  dependenteNome: z.string().nullable(),
  periodoInicio: z.coerce.date().nullable(),
  periodoFim: z.coerce.date().nullable(),
  emitidaEm: z.coerce.date(),
  status: statusDeclaracaoSchema,
  temArquivoOriginal: z.boolean(),
  temArquivoAssinado: z.boolean(),
  assinadaEm: z.coerce.date().nullable(),
  assinadaPorEmail: z.string().nullable(),
});
export type DeclaracaoEmitida = z.infer<typeof declaracaoEmitidaSchema>;

export const listarDeclaracoesQuerySchema = z.object({
  status: statusDeclaracaoSchema.optional(),
  busca: z.string().trim().max(120).optional(),
});
export type ListarDeclaracoesQuery = z.infer<typeof listarDeclaracoesQuerySchema>;

export const uploadAssinaturaResponseSchema = z.object({ url: z.string() });
export type UploadAssinaturaResponse = z.infer<typeof uploadAssinaturaResponseSchema>;
