import { z } from 'zod';
import { roleSchema } from './enums';

// Representação do User trafegada entre api e web.
// senhaHash nunca sai do backend, por isso não faz parte deste schema.
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: roleSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;
