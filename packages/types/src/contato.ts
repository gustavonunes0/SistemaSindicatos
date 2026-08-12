import { z } from 'zod';

export const contatoAssuntoSchema = z.enum([
  'duvida',
  'filiacao',
  'convenio',
  'imovel',
  'financeiro',
  'outro',
]);
export type ContatoAssunto = z.infer<typeof contatoAssuntoSchema>;

export const CONTATO_ASSUNTO_ROTULO: Record<ContatoAssunto, string> = {
  duvida: 'Dúvida geral',
  filiacao: 'Filiação / afiliado',
  convenio: 'Convênios',
  imovel: 'Apartamentos / locação',
  financeiro: 'Financeiro / mensalidade',
  outro: 'Outro assunto',
};

export const enviarContatoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(120),
  email: z.string().trim().email('Informe um e-mail válido').max(180),
  telefone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : undefined)),
  assunto: contatoAssuntoSchema,
  mensagem: z.string().trim().min(10, 'Escreva uma mensagem com pelo menos 10 caracteres').max(4000),
});
export type EnviarContatoInput = z.infer<typeof enviarContatoSchema>;

export const enviarContatoResultadoSchema = z.object({
  enviado: z.boolean(),
  modo: z.enum(['smtp', 'resend', 'registrado']),
  message: z.string(),
});
export type EnviarContatoResultado = z.infer<typeof enviarContatoResultadoSchema>;
