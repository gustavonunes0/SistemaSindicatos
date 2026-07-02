import { z } from 'zod';

// Schema de exemplo — os schemas de domínio (User, Afiliado, etc.)
// serão adicionados nos próximos blocos.
export const healthCheckSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
});

export type HealthCheck = z.infer<typeof healthCheckSchema>;
