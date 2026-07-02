import type { Role } from '@sindprf/types';

// Payload do JWT de acesso.
export interface JwtPayload {
  sub: string;
  role: Role;
}

// Usuário autenticado anexado ao request pelo JwtAuthGuard.
export interface RequestUser {
  id: string;
  role: Role;
}
