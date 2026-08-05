import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { tenantAls, type TenantContextStore } from './tenant-context';
import { TenantService } from './tenant.service';

export type RequestComTenant = Request & {
  tenant?: TenantContextStore;
};

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenants: TenantService) {}

  async use(req: RequestComTenant, res: Response, next: NextFunction): Promise<void> {
    // Health (GET /) e assets estáticos não exigem tenant.
    if (req.path === '/' || req.path === '/health' || req.path.startsWith('/uploads/')) {
      next();
      return;
    }

    try {
      const host = this.tenants.extrairHostDoRequest(
        req.headers as Record<string, string | string[] | undefined>,
      );
      const tenant = await this.tenants.resolverPorHost(host);
      const store: TenantContextStore = {
        tenantId: tenant.id,
        slug: tenant.slug,
        host,
        timezone: tenant.timezone,
        nome: tenant.nome,
      };
      req.tenant = store;
      tenantAls.run(store, () => next());
    } catch (error) {
      if (error instanceof NotFoundException || (error as { status?: number }).status === 404) {
        res.status(404).json({
          statusCode: 404,
          message: error instanceof Error ? error.message : 'Tenant não encontrado',
          error: 'Not Found',
        });
        return;
      }
      next(error);
    }
  }
}
