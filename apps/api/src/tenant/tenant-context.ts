import { AsyncLocalStorage } from 'node:async_hooks';
import { InternalServerErrorException } from '@nestjs/common';

export interface TenantContextStore {
  tenantId: string;
  slug: string;
  host: string;
  timezone: string;
  nome: string;
  /** Quando true, a extension Prisma não injeta filtro de tenant (seed/scripts). */
  bypass?: boolean;
}

export const tenantAls = new AsyncLocalStorage<TenantContextStore>();

export function getTenantContext(): TenantContextStore | undefined {
  return tenantAls.getStore();
}

export function requireTenantId(): string {
  const ctx = tenantAls.getStore();
  if (!ctx?.tenantId || ctx.bypass) {
    throw new InternalServerErrorException('Contexto de tenant ausente');
  }
  return ctx.tenantId;
}

export function runWithTenant<T>(store: TenantContextStore, fn: () => T): T {
  return tenantAls.run(store, fn);
}

export async function runWithTenantAsync<T>(
  store: TenantContextStore,
  fn: () => Promise<T>,
): Promise<T> {
  return tenantAls.run(store, fn);
}

export async function runWithoutTenant<T>(fn: () => Promise<T>): Promise<T> {
  return tenantAls.run(
    {
      tenantId: '',
      slug: '',
      host: '',
      timezone: 'UTC',
      nome: '',
      bypass: true,
    },
    fn,
  );
}
