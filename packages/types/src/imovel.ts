import { z } from 'zod';

export const tipoPeriodoSchema = z.enum(['RESERVADO', 'BLOQUEADO']);
export type TipoPeriodo = z.infer<typeof tipoPeriodoSchema>;

export const fotoImovelSchema = z.object({
  id: z.string(),
  imovelId: z.string(),
  url: z.string(),
  ordem: z.number(),
});
export type FotoImovel = z.infer<typeof fotoImovelSchema>;

export const imovelSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  endereco: z.string(),
  valor: z.number(),
  comodidades: z.array(z.string()),
  ativo: z.boolean(),
  fotos: z.array(fotoImovelSchema).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Imovel = z.infer<typeof imovelSchema>;

export const criarImovelSchema = z.object({
  titulo: z.string().min(3, 'Informe o título'),
  descricao: z.string().min(10, 'Descreva o imóvel em ao menos 10 caracteres'),
  endereco: z.string().min(5, 'Informe o endereço'),
  valor: z.coerce.number().positive('Informe um valor positivo'),
  comodidades: z.array(z.string().min(1)).default([]),
  ativo: z.boolean().default(true),
});
export type CriarImovelInput = z.infer<typeof criarImovelSchema>;

export const atualizarImovelSchema = criarImovelSchema.partial();
export type AtualizarImovelInput = z.infer<typeof atualizarImovelSchema>;

export const filtroImoveisSchema = z.object({
  busca: z.string().optional(),
});
export type FiltroImoveisInput = z.infer<typeof filtroImoveisSchema>;

export const periodoSchema = z.object({
  id: z.string(),
  imovelId: z.string(),
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
  tipo: tipoPeriodoSchema,
});
export type Periodo = z.infer<typeof periodoSchema>;

export const criarPeriodoSchema = z
  .object({
    inicio: z.coerce.date(),
    fim: z.coerce.date(),
    tipo: tipoPeriodoSchema,
  })
  .refine((dados) => dados.fim > dados.inicio, {
    message: 'A data final deve ser posterior à inicial',
    path: ['fim'],
  });
export type CriarPeriodoInput = z.infer<typeof criarPeriodoSchema>;

export const consultaDisponibilidadeSchema = z
  .object({
    inicio: z.coerce.date(),
    fim: z.coerce.date(),
  })
  .refine((dados) => dados.fim > dados.inicio, {
    message: 'A data final deve ser posterior à inicial',
    path: ['fim'],
  });
export type ConsultaDisponibilidadeInput = z.infer<typeof consultaDisponibilidadeSchema>;

export const disponibilidadeImovelSchema = z.object({
  disponivel: z.boolean(),
  periodos: z.array(periodoSchema),
});
export type DisponibilidadeImovel = z.infer<typeof disponibilidadeImovelSchema>;

export const uploadFotoImovelResponseSchema = z.object({
  url: z.string(),
});
export type UploadFotoImovelResponse = z.infer<typeof uploadFotoImovelResponseSchema>;
