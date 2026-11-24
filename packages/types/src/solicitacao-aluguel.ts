import { z } from 'zod';
import { cpfSchema } from './cpf';
import { roleSchema } from './enums';

export const statusSolicitacaoSchema = z.enum(['ABERTA', 'EM_ANDAMENTO', 'FECHADA']);
export type StatusSolicitacao = z.infer<typeof statusSolicitacaoSchema>;

export const perfilHospedagemPedidoSchema = z.enum([
  'FILIADO_SINDPRF',
  'FILIADO_OUTRO',
  'NAO_FILIADO',
]);
export type PerfilHospedagemPedido = z.infer<typeof perfilHospedagemPedidoSchema>;

export const PERFIL_HOSPEDAGEM_PEDIDO_ROTULO: Record<PerfilHospedagemPedido, string> = {
  FILIADO_SINDPRF: 'Filiado SINDPRF-CE',
  FILIADO_OUTRO: 'Filiado a outro estado',
  NAO_FILIADO: 'PRF não filiado',
};

export const solicitacaoAluguelSchema = z.object({
  id: z.string(),
  imovelId: z.string(),
  afiliadoId: z.string().nullable(),
  perfilHospedagem: perfilHospedagemPedidoSchema,
  solicitanteNome: z.string().nullable(),
  solicitanteCpf: z.string().nullable(),
  solicitanteEmail: z.string().nullable(),
  solicitanteTelefone: z.string().nullable(),
  sindicatoOrigem: z.string().nullable(),
  acompanhantes: z.string().nullable(),
  observacoes: z.string().nullable(),
  inicioDesejado: z.coerce.date(),
  fimDesejado: z.coerce.date(),
  status: statusSolicitacaoSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SolicitacaoAluguel = z.infer<typeof solicitacaoAluguelSchema>;

export const solicitacaoResumoSchema = solicitacaoAluguelSchema.extend({
  imovel: z.object({
    id: z.string(),
    titulo: z.string(),
  }),
  afiliado: z
    .object({
      id: z.string(),
      nome: z.string(),
    })
    .nullable(),
  solicitanteExibicao: z.string(),
  totalMensagens: z.number(),
});
export type SolicitacaoResumo = z.infer<typeof solicitacaoResumoSchema>;

export const criarSolicitacaoSchema = z
  .object({
    imovelId: z.string().min(1),
    inicioDesejado: z.coerce.date(),
    fimDesejado: z.coerce.date(),
    /** Lista de acompanhantes — obrigatória pelo regulamento (item 3.4). */
    acompanhantes: z
      .string()
      .trim()
      .min(2, 'Indique os acompanhantes ou escreva “somente eu”')
      .max(2000),
    mensagemInicial: z.string().trim().max(2000).optional(),
  })
  .refine((dados) => dados.fimDesejado > dados.inicioDesejado, {
    message: 'A data de saída deve ser posterior à de entrada',
    path: ['fimDesejado'],
  });
export type CriarSolicitacaoInput = z.infer<typeof criarSolicitacaoSchema>;

/** Pedido público — sem login (filiado de outro estado ou não filiado). */
export const criarSolicitacaoPublicaSchema = z
  .object({
    imovelId: z.string().min(1),
    perfilHospedagem: z.enum(['FILIADO_OUTRO', 'NAO_FILIADO']),
    nome: z.string().trim().min(3, 'Informe o nome completo').max(120),
    cpf: cpfSchema,
    email: z.string().trim().email('Informe um e-mail válido').max(120),
    telefone: z.string().trim().min(8, 'Informe um telefone').max(30),
    sindicatoOrigem: z.preprocess(
      (valor) => (valor === '' || valor === null ? undefined : valor),
      z.string().trim().min(2).max(120).optional(),
    ),
    acompanhantes: z
      .string()
      .trim()
      .min(2, 'Indique os acompanhantes ou escreva “somente eu”')
      .max(2000),
    observacoes: z.preprocess(
      (valor) => (valor === '' || valor === null ? undefined : valor),
      z.string().trim().max(2000).optional(),
    ),
    inicioDesejado: z.coerce.date(),
    fimDesejado: z.coerce.date(),
  })
  .superRefine((dados, ctx) => {
    if (!(dados.fimDesejado > dados.inicioDesejado)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A data de saída deve ser posterior à de entrada',
        path: ['fimDesejado'],
      });
    }
    if (dados.perfilHospedagem === 'FILIADO_OUTRO' && !dados.sindicatoOrigem?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o sindicato de origem',
        path: ['sindicatoOrigem'],
      });
    }
  });
export type CriarSolicitacaoPublicaInput = z.infer<typeof criarSolicitacaoPublicaSchema>;

export const atualizarStatusSolicitacaoSchema = z.object({
  status: statusSolicitacaoSchema,
});
export type AtualizarStatusSolicitacaoInput = z.infer<typeof atualizarStatusSolicitacaoSchema>;

export const filtroSolicitacoesAdminSchema = z.object({
  status: statusSolicitacaoSchema.optional(),
});
export type FiltroSolicitacoesAdminInput = z.infer<typeof filtroSolicitacoesAdminSchema>;

export const mensagemSchema = z.object({
  id: z.string(),
  solicitacaoId: z.string(),
  autorId: z.string(),
  texto: z.string(),
  criadoEm: z.coerce.date(),
  autorNome: z.string(),
  autorRole: roleSchema,
});
export type Mensagem = z.infer<typeof mensagemSchema>;

export const enviarMensagemSchema = z.object({
  texto: z.string().min(1, 'Escreva uma mensagem').max(4000),
});
export type EnviarMensagemInput = z.infer<typeof enviarMensagemSchema>;
