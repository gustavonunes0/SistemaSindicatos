import { z } from 'zod';

// Campos opcionais de formulário: "" vira null. Diferente de `z.preprocess`,
// estes preservam o tipo de entrada (string), então o formulário no front é
// tipado de verdade — sem casts para Date/unknown.
const textoOpcional = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((valor) => valor || null);

const urlOpcional = textoOpcional.refine(
  (valor) => valor === null || z.string().url().safeParse(valor).success,
  { message: 'Link inválido' },
);

/** `<input type="datetime-local">` entrega string; a API aceita string ou Date. */
const dataDeFormulario = z
  .union([z.string(), z.date()])
  .pipe(z.coerce.date({ errorMap: () => ({ message: 'Informe uma data e hora válidas' }) }));

export const publicoAlertaSchema = z.enum(['TODOS', 'FILIADOS']);
export type PublicoAlerta = z.infer<typeof publicoAlertaSchema>;

export const PUBLICO_ALERTA_ROTULO: Record<PublicoAlerta, string> = {
  TODOS: 'Todos os visitantes',
  FILIADOS: 'Somente filiados',
};

export const alertaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  mensagem: z.string(),
  imagemUrl: z.string().nullable(),
  linkUrl: z.string().nullable(),
  linkTexto: z.string().nullable(),
  publico: publicoAlertaSchema,
  ativo: z.boolean(),
  inicioEm: z.coerce.date(),
  fimEm: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Alerta = z.infer<typeof alertaSchema>;

/** O que o site precisa para desenhar o popup — sem campos de gestão. */
export const alertaPublicoSchema = alertaSchema.pick({
  id: true,
  titulo: true,
  mensagem: true,
  imagemUrl: true,
  linkUrl: true,
  linkTexto: true,
});
export type AlertaPublico = z.infer<typeof alertaPublicoSchema>;

const alertaCamposSchema = z.object({
  titulo: z.string().trim().min(3, 'Título deve ter no mínimo 3 caracteres').max(120),
  mensagem: z.string().trim().min(1, 'Mensagem é obrigatória').max(2000),
  imagemUrl: textoOpcional,
  linkUrl: urlOpcional,
  linkTexto: textoOpcional,
  publico: publicoAlertaSchema.default('TODOS'),
  ativo: z.boolean().default(true),
  inicioEm: dataDeFormulario,
  fimEm: dataDeFormulario,
});

/** Fim depois do início; botão só faz sentido com link. */
function validarRegras(
  dados: Partial<z.infer<typeof alertaCamposSchema>>,
  ctx: z.RefinementCtx,
): void {
  if (dados.inicioEm && dados.fimEm && dados.fimEm <= dados.inicioEm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fimEm'],
      message: 'A data final deve ser posterior à inicial',
    });
  }
  if (dados.linkTexto && !dados.linkUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['linkUrl'],
      message: 'Informe o link de destino do botão',
    });
  }
}

export const criarAlertaSchema = alertaCamposSchema.superRefine(validarRegras);
export type CriarAlertaInput = z.infer<typeof criarAlertaSchema>;

export const atualizarAlertaSchema = alertaCamposSchema.partial().superRefine(validarRegras);
export type AtualizarAlertaInput = z.infer<typeof atualizarAlertaSchema>;

export const uploadImagemAlertaResponseSchema = z.object({
  url: z.string(),
});
export type UploadImagemAlertaResponse = z.infer<typeof uploadImagemAlertaResponseSchema>;
