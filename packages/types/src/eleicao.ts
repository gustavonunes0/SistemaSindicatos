import { z } from 'zod';

const textoOpcional = z.preprocess(
  (valor) => (valor === '' ? null : valor),
  z.string().trim().nullable().optional(),
);

const urlOpcional = z.preprocess(
  (valor) => (valor === '' ? null : valor),
  z.string().url('Link inválido').nullable().optional(),
);

// =====================================================================
// Enums
// =====================================================================

export const statusEleicaoSchema = z.enum(['AGENDADA', 'ABERTA', 'ENCERRADA', 'APURADA']);
export type StatusEleicao = z.infer<typeof statusEleicaoSchema>;

export const chapaStatusSchema = z.enum(['INSCRITA', 'HOMOLOGADA', 'NAO_HOMOLOGADA']);
export type ChapaStatus = z.infer<typeof chapaStatusSchema>;

export const tipoContestacaoSchema = z.enum(['IMPUGNACAO', 'RECURSO']);
export type TipoContestacao = z.infer<typeof tipoContestacaoSchema>;

export const statusContestacaoSchema = z.enum(['ABERTA', 'DEFERIDA', 'INDEFERIDA']);
export type StatusContestacao = z.infer<typeof statusContestacaoSchema>;

// =====================================================================
// Candidato / Chapa
// =====================================================================

export const candidatoSchema = z.object({
  id: z.string(),
  chapaId: z.string(),
  nome: z.string(),
  cargo: z.string(),
  fotoUrl: z.string().nullable(),
});
export type Candidato = z.infer<typeof candidatoSchema>;

export const criarCandidatoSchema = z.object({
  nome: z.string().min(2, 'Informe o nome do candidato'),
  cargo: z.string().min(2, 'Informe o cargo'),
  fotoUrl: urlOpcional,
});
export type CriarCandidatoInput = z.infer<typeof criarCandidatoSchema>;
export const atualizarCandidatoSchema = criarCandidatoSchema.partial();
export type AtualizarCandidatoInput = z.infer<typeof atualizarCandidatoSchema>;

export const chapaSchema = z.object({
  id: z.string(),
  eleicaoId: z.string(),
  numero: z.number().int(),
  nome: z.string(),
  slogan: z.string().nullable(),
  status: chapaStatusSchema,
  justificativaHomologacao: z.string().nullable(),
  homologadaEm: z.coerce.date().nullable(),
  prazoContestacaoFim: z.coerce.date().nullable(),
  candidatos: z.array(candidatoSchema),
});
export type Chapa = z.infer<typeof chapaSchema>;

export const criarChapaSchema = z.object({
  numero: z.number().int().positive('Número deve ser positivo'),
  nome: z.string().min(2, 'Informe o nome da chapa'),
  slogan: textoOpcional,
});
export type CriarChapaInput = z.infer<typeof criarChapaSchema>;
export const atualizarChapaSchema = criarChapaSchema.partial();
export type AtualizarChapaInput = z.infer<typeof atualizarChapaSchema>;

export const homologarChapaSchema = z.object({
  status: z.enum(['HOMOLOGADA', 'NAO_HOMOLOGADA']),
  justificativa: z.string().min(5, 'Justifique a decisão em ao menos 5 caracteres'),
});
export type HomologarChapaInput = z.infer<typeof homologarChapaSchema>;

// =====================================================================
// Contestação (impugnação/recurso)
// =====================================================================

export const contestacaoSchema = z.object({
  id: z.string(),
  chapaId: z.string(),
  tipo: tipoContestacaoSchema,
  status: statusContestacaoSchema,
  motivo: z.string(),
  decisao: z.string().nullable(),
  decididoEm: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type Contestacao = z.infer<typeof contestacaoSchema>;

export const criarContestacaoSchema = z.object({
  motivo: z.string().min(10, 'Descreva o motivo em ao menos 10 caracteres'),
});
export type CriarContestacaoInput = z.infer<typeof criarContestacaoSchema>;

export const resolverContestacaoSchema = z.object({
  status: z.enum(['DEFERIDA', 'INDEFERIDA']),
  decisao: z.string().min(5, 'Justifique a decisão em ao menos 5 caracteres'),
});
export type ResolverContestacaoInput = z.infer<typeof resolverContestacaoSchema>;

// =====================================================================
// Comissão Eleitoral
// =====================================================================

export const membroComissaoSchema = z.object({
  userId: z.string(),
  email: z.string(),
  titular: z.boolean(),
});
export type MembroComissao = z.infer<typeof membroComissaoSchema>;

export const adicionarMembroComissaoSchema = z.object({
  userId: z.string(),
  titular: z.boolean().default(true),
});
export type AdicionarMembroComissaoInput = z.infer<typeof adicionarMembroComissaoSchema>;

// =====================================================================
// Eleição
// =====================================================================

export const eleicaoResumoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().nullable(),
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
  status: statusEleicaoSchema,
  resolvidaPorAclamacao: z.boolean(),
});
export type EleicaoResumo = z.infer<typeof eleicaoResumoSchema>;

export const eleicaoDetalheSchema = eleicaoResumoSchema.extend({
  chapas: z.array(chapaSchema),
});
export type EleicaoDetalhe = z.infer<typeof eleicaoDetalheSchema>;

export const eleicaoAdminDetalheSchema = eleicaoDetalheSchema.extend({
  inscricaoInicio: z.coerce.date().nullable(),
  inscricaoFim: z.coerce.date().nullable(),
  totalElegiveis: z.number().int(),
  totalComparecimentos: z.number().int(),
});
export type EleicaoAdminDetalhe = z.infer<typeof eleicaoAdminDetalheSchema>;

export const criarEleicaoSchema = z
  .object({
    titulo: z.string().min(3, 'Informe o título'),
    descricao: textoOpcional,
    inicio: z.coerce.date(),
    fim: z.coerce.date(),
    inscricaoInicio: z.coerce.date().nullable().optional(),
    inscricaoFim: z.coerce.date().nullable().optional(),
  })
  .refine((dados) => dados.fim > dados.inicio, {
    message: 'Fim deve ser após o início',
    path: ['fim'],
  });
export type CriarEleicaoInput = z.infer<typeof criarEleicaoSchema>;

export const atualizarEleicaoSchema = z.object({
  titulo: z.string().min(3).optional(),
  descricao: textoOpcional,
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
  inscricaoInicio: z.coerce.date().nullable().optional(),
  inscricaoFim: z.coerce.date().nullable().optional(),
});
export type AtualizarEleicaoInput = z.infer<typeof atualizarEleicaoSchema>;

// =====================================================================
// Elegibilidade
// =====================================================================

export const elegivelResumoSchema = z.object({
  afiliadoId: z.string(),
  nome: z.string(),
  matricula: z.string(),
  compareceu: z.boolean(),
});
export type ElegivelResumo = z.infer<typeof elegivelResumoSchema>;

export const incluirElegivelSchema = z.object({
  afiliadoId: z.string(),
});
export type IncluirElegivelInput = z.infer<typeof incluirElegivelSchema>;

// =====================================================================
// Votação
// =====================================================================

export const meuStatusVotacaoSchema = z.object({
  elegivel: z.boolean(),
  jaVotou: z.boolean(),
  protocolo: z.string().nullable(),
  votouEm: z.coerce.date().nullable(),
});
export type MeuStatusVotacao = z.infer<typeof meuStatusVotacaoSchema>;

export const votarInputSchema = z.object({
  chapaId: z.string(),
});
export type VotarInput = z.infer<typeof votarInputSchema>;

export const comprovanteVotoSchema = z.object({
  protocolo: z.string(),
  votouEm: z.coerce.date(),
});
export type ComprovanteVoto = z.infer<typeof comprovanteVotoSchema>;

// =====================================================================
// Apuração / Resultado / Aclamação
// =====================================================================

export const resolverAclamacaoSchema = z.object({
  chapaId: z.string(),
});
export type ResolverAclamacaoInput = z.infer<typeof resolverAclamacaoSchema>;

export const resultadoChapaSchema = z.object({
  chapaId: z.string(),
  numero: z.number().int(),
  nome: z.string(),
  totalVotos: z.number().int(),
  percentual: z.number(),
});
export type ResultadoChapa = z.infer<typeof resultadoChapaSchema>;

export const resultadoEleicaoSchema = z.object({
  eleicaoId: z.string(),
  porAclamacao: z.boolean(),
  apuradoEm: z.coerce.date(),
  totalVotos: z.number().int(),
  resultados: z.array(resultadoChapaSchema),
});
export type ResultadoEleicao = z.infer<typeof resultadoEleicaoSchema>;
