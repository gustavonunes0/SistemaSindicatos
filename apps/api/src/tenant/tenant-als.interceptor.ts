import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, defer, from, lastValueFrom } from 'rxjs';
import { tenantAls, type TenantContextStore } from './tenant-context';
import type { RequestComTenant } from './tenant.middleware';
import { TenantService } from './tenant.service';

/**
 * Garante AsyncLocalStorage do tenant dentro do pipeline Nest.
 * Se o middleware não preencheu req.tenant, resolve pelo header/Host.
 */
@Injectable()
export class TenantAlsInterceptor implements NestInterceptor {
  constructor(private readonly tenants: TenantService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<RequestComTenant>();

    return defer(() =>
      from(
        (async () => {
          const store = await this.obterStore(req);
          if (!store) {
            return lastValueFrom(next.handle());
          }
          req.tenant = store;
          return tenantAls.run(store, () => lastValueFrom(next.handle()));
        })(),
      ),
    );
  }

  private async obterStore(req: RequestComTenant): Promise<TenantContextStore | null> {
    if (req.tenant?.tenantId) {
      return req.tenant;
    }

    // Rotas públicas sem tenant (health já exclusa do middleware).
    if (req.method === 'OPTIONS' || req.path === '/' || req.path === '/health') {
      return null;
    }

    try {
      const host = this.tenants.extrairHostDoRequest(
        req.headers as Record<string, string | string[] | undefined>,
      );
      const tenant = await this.tenants.resolverPorHost(host);
      return {
        tenantId: tenant.id,
        slug: tenant.slug,
        host,
        timezone: tenant.timezone,
        nome: tenant.nome,
      };
    } catch {
      return null;
    }
  }
}
