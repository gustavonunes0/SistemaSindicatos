import { z } from 'zod';

export const statusSolicitacaoSchema = z.enum(['ABERTA', 'EM_ANDAMENTO', 'FECHADA']);
export type StatusSolicitacao = z.infer<typeof statusSolicitacaoSchema>;

export const solicitacaoAluguelSchema = z.object({
  id: z.string(),
  imovelId: z.string(),
  afiliadoId: z.string(),
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
  afiliado: z.object({
    id: z.string(),
    nome: z.string(),
  }),
  totalMensagens: z.number(),
});
export type SolicitacaoResumo = z.infer<typeof solicitacaoResumoSchema>;

export const criarSolicitacaoSchema = z
  .object({
    imovelId: z.string().min(1),
    inicioDesejado: z.coerce.date(),
    fimDesejado: z.coerce.date(),
    mensagemInicial: z.string().min(1, 'Escreva uma mensagem para o sindicato').optional(),
  })
  .refine((dados) => dados.fimDesejado > dados.inicioDesejado, {
    message: 'A data de saída deve ser posterior à de entrada',
    path: ['fimDesejado'],
  });
export type CriarSolicitacaoInput = z.infer<typeof criarSolicitacaoSchema>;

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
  autorRole: z.enum(['ADMIN', 'AFILIADO']),
});
export type Mensagem = z.infer<typeof mensagemSchema>;

export const enviarMensagemSchema = z.object({
  texto: z.string().min(1, 'Escreva uma mensagem').max(4000),
});
export type EnviarMensagemInput = z.infer<typeof enviarMensagemSchema>;
