import type { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  tenantId: string;
}

export interface RequestUser {
  id: string;
  role: Role;
  tenantId: string;
}
