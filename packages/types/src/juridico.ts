import { z } from 'zod';
import { cpfSchema } from './cpf';

export const acaoJuridicaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  cpf: z.string(),
  numeroAcao: z.string(),
  status: z.string(),
  afiliadoId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AcaoJuridica = z.infer<typeof acaoJuridicaSchema>;

export const importacaoAcaoJuridicaSchema = z.object({
  id: z.string(),
  arquivoNome: z.string(),
  totalLinhas: z.number().int(),
  novas: z.number().int(),
  atualizadas: z.number().int(),
  createdAt: z.coerce.date(),
});
export type ImportacaoAcaoJuridica = z.infer<typeof importacaoAcaoJuridicaSchema>;

export const importacaoAcaoJuridicaResumoSchema = z.object({
  totalLinhas: z.number().int(),
  novas: z.number().int(),
  atualizadas: z.number().int(),
  vinculados: z.number().int(),
  semCadastro: z.number().int(),
});
export type ImportacaoAcaoJuridicaResumo = z.infer<typeof importacaoAcaoJuridicaResumoSchema>;

export const importarAcaoJuridicaResultadoSchema = z.object({
  importacao: importacaoAcaoJuridicaSchema,
  resumo: importacaoAcaoJuridicaResumoSchema,
});
export type ImportarAcaoJuridicaResultado = z.infer<typeof importarAcaoJuridicaResultadoSchema>;

export const linhaAcaoJuridicaImportSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  cpf: cpfSchema,
  numeroAcao: z.string().min(1, 'Nº da ação obrigatório'),
  status: z.string().min(1, 'Status obrigatório'),
});
export type LinhaAcaoJuridicaImport = z.infer<typeof linhaAcaoJuridicaImportSchema>;

export const listarAcoesJuridicasQuerySchema = z.object({
  busca: z.string().max(120).optional(),
});
export type ListarAcoesJuridicasQuery = z.infer<typeof listarAcoesJuridicasQuerySchema>;
