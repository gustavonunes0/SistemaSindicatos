import { z } from 'zod';

export const tipoCampoFormularioSchema = z.enum([
  'TEXTO_CURTO',
  'TEXTO_LONGO',
  'NUMERO',
  'DATA',
  'ESCOLHA_UNICA',
  'MULTIPLA_ESCOLHA',
  'LISTA',
  'ARQUIVO',
]);
export type TipoCampoFormulario = z.infer<typeof tipoCampoFormularioSchema>;

export const TIPO_CAMPO_ROTULO: Record<TipoCampoFormulario, string> = {
  TEXTO_CURTO: 'Texto curto',
  TEXTO_LONGO: 'Texto longo',
  NUMERO: 'Número',
  DATA: 'Data',
  ESCOLHA_UNICA: 'Escolha única',
  MULTIPLA_ESCOLHA: 'Múltipla escolha',
  LISTA: 'Lista suspensa',
  ARQUIVO: 'Envio de arquivo',
};

/** Tipos cujas opções o admin precisa cadastrar. */
export const TIPOS_COM_OPCOES: TipoCampoFormulario[] = [
  'ESCOLHA_UNICA',
  'MULTIPLA_ESCOLHA',
  'LISTA',
];

export function campoTemOpcoes(tipo: TipoCampoFormulario): boolean {
  return TIPOS_COM_OPCOES.includes(tipo);
}

export const publicoFormularioSchema = z.enum(['TODOS', 'FILIADOS']);
export type PublicoFormulario = z.infer<typeof publicoFormularioSchema>;

export const PUBLICO_FORMULARIO_ROTULO: Record<PublicoFormulario, string> = {
  TODOS: 'Qualquer pessoa com o link',
  FILIADOS: 'Somente filiados aprovados',
};

export const statusFormularioSchema = z.enum(['RASCUNHO', 'PUBLICADO', 'ENCERRADO']);
export type StatusFormulario = z.infer<typeof statusFormularioSchema>;

export const STATUS_FORMULARIO_ROTULO: Record<StatusFormulario, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADO: 'Publicado',
  ENCERRADO: 'Encerrado',
};

export const campoFormularioSchema = z
  .object({
    /** Gerado no construtor; é a chave que liga pergunta e resposta. */
    id: z.string().min(1),
    rotulo: z.string().trim().min(1, 'A pergunta precisa de um enunciado').max(200),
    tipo: tipoCampoFormularioSchema,
    ajuda: z.string().trim().max(300).nullable().default(null),
    obrigatorio: z.boolean().default(false),
    opcoes: z.array(z.string().trim().min(1)).default([]),
  })
  .superRefine((campo, ctx) => {
    if (campoTemOpcoes(campo.tipo) && campo.opcoes.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['opcoes'],
        message: 'Cadastre pelo menos duas opções',
      });
    }
    if (new Set(campo.opcoes).size !== campo.opcoes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['opcoes'],
        message: 'Há opções repetidas',
      });
    }
  });
export type CampoFormulario = z.infer<typeof campoFormularioSchema>;

export const formularioSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  slug: z.string(),
  descricao: z.string().nullable(),
  /** Link de um formulário mantido fora da plataforma, como Google Forms. */
  urlExterna: z.string().url().nullable(),
  campos: z.array(campoFormularioSchema),
  publico: publicoFormularioSchema,
  status: statusFormularioSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Formulario = z.infer<typeof formularioSchema>;

/** Listagem do admin: sem as perguntas, com a contagem de respostas. */
export const formularioListagemSchema = formularioSchema
  .omit({ campos: true })
  .extend({ totalRespostas: z.number().int(), totalCampos: z.number().int() });
export type FormularioListagem = z.infer<typeof formularioListagemSchema>;

const formularioCamposSchema = z.object({
  titulo: z.string().trim().min(3, 'Título deve ter no mínimo 3 caracteres').max(150),
  descricao: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((valor) => valor || null),
  campos: z.array(campoFormularioSchema).default([]),
  publico: publicoFormularioSchema.default('FILIADOS'),
  status: statusFormularioSchema.default('RASCUNHO'),
});

export const formularioExternoSchema = z.object({
  titulo: z.string().trim().min(3, 'Título deve ter no mínimo 3 caracteres').max(150),
  descricao: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((valor) => valor || null),
  urlExterna: z
    .string()
    .trim()
    .url('Informe o endereço completo do formulário, começando com https://'),
  publico: publicoFormularioSchema.default('FILIADOS'),
  status: statusFormularioSchema.default('PUBLICADO'),
});
export type FormularioExternoInput = z.infer<typeof formularioExternoSchema>;

function validarFormulario(
  dados: Partial<z.infer<typeof formularioCamposSchema>>,
  ctx: z.RefinementCtx,
): void {
  const campos = dados.campos;
  if (campos) {
    if (dados.status === 'PUBLICADO' && campos.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['campos'],
        message: 'Adicione ao menos uma pergunta antes de publicar',
      });
    }
    if (new Set(campos.map((campo) => campo.id)).size !== campos.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['campos'],
        message: 'Há perguntas com identificador repetido',
      });
    }
  }
}

export const criarFormularioSchema = formularioCamposSchema.superRefine(validarFormulario);
export type CriarFormularioInput = z.infer<typeof criarFormularioSchema>;

export const atualizarFormularioSchema = formularioCamposSchema
  .partial()
  .superRefine(validarFormulario);
export type AtualizarFormularioInput = z.infer<typeof atualizarFormularioSchema>;

/**
 * O que a página pública recebe. `campos` só vem preenchido quando a pessoa
 * pode responder — assim um formulário restrito não expõe suas perguntas.
 */
export const formularioPublicoSchema = z.object({
  titulo: z.string(),
  slug: z.string(),
  descricao: z.string().nullable(),
  urlExterna: z.string().url().nullable(),
  publico: publicoFormularioSchema,
  status: statusFormularioSchema,
  campos: z.array(campoFormularioSchema),
  podeResponder: z.boolean(),
  jaRespondeu: z.boolean(),
  /** Por que não pode responder, para a tela explicar em vez de só bloquear. */
  motivo: z
    .enum(['OK', 'PRECISA_LOGIN', 'PRECISA_APROVACAO', 'ENCERRADO', 'JA_RESPONDEU'])
    .default('OK'),
});
export type FormularioPublico = z.infer<typeof formularioPublicoSchema>;

export const arquivoRespostaSchema = z.object({
  url: z.string(),
  nome: z.string(),
});
export type ArquivoResposta = z.infer<typeof arquivoRespostaSchema>;

/** O que o navegador envia por pergunta. O servidor valida contra a definição. */
export const valorEnviadoSchema = z.object({
  campoId: z.string().min(1),
  texto: z.string().nullable().optional(),
  selecionados: z.array(z.string()).optional(),
  arquivo: arquivoRespostaSchema.nullable().optional(),
});
export type ValorEnviado = z.infer<typeof valorEnviadoSchema>;

export const enviarRespostaSchema = z.object({
  valores: z.array(valorEnviadoSchema),
});
export type EnviarRespostaInput = z.infer<typeof enviarRespostaSchema>;

/** Resposta gravada: guarda a pergunta como ela era no momento do envio. */
export const itemRespostaSchema = z.object({
  campoId: z.string(),
  rotulo: z.string(),
  tipo: tipoCampoFormularioSchema,
  texto: z.string().nullable().default(null),
  selecionados: z.array(z.string()).default([]),
  arquivo: arquivoRespostaSchema.nullable().default(null),
});
export type ItemResposta = z.infer<typeof itemRespostaSchema>;

export const respostaFormularioSchema = z.object({
  id: z.string(),
  formularioId: z.string(),
  afiliadoId: z.string().nullable(),
  afiliadoNome: z.string().nullable(),
  afiliadoMatricula: z.string().nullable(),
  valores: z.array(itemRespostaSchema),
  enviadoEm: z.coerce.date(),
});
export type RespostaFormulario = z.infer<typeof respostaFormularioSchema>;

/** Contagem por opção, para as perguntas de escolha. */
export const resumoCampoSchema = z.object({
  campoId: z.string(),
  rotulo: z.string(),
  tipo: tipoCampoFormularioSchema,
  totalRespondido: z.number().int(),
  contagem: z.array(z.object({ opcao: z.string(), total: z.number().int() })),
});
export type ResumoCampo = z.infer<typeof resumoCampoSchema>;

export const respostasFormularioSchema = z.object({
  formulario: formularioSchema,
  respostas: z.array(respostaFormularioSchema),
  resumo: z.array(resumoCampoSchema),
});
export type RespostasFormulario = z.infer<typeof respostasFormularioSchema>;

export const uploadArquivoFormularioResponseSchema = arquivoRespostaSchema;
export type UploadArquivoFormularioResponse = z.infer<
  typeof uploadArquivoFormularioResponseSchema
>;
