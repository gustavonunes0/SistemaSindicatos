import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, defer, from, lastValueFrom } from 'rxjs';
import type { RequestComTenant } from './tenant.middleware';
import { tenantAls } from './tenant-context';

/**
 * Garante AsyncLocalStorage do tenant dentro do pipeline Nest.
 * Middleware Express sozinho perde o ALS no handler assíncrono.
 */
@Injectable()
export class TenantAlsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<RequestComTenant>();
    const store = req.tenant;
    if (!store?.tenantId) {
      return next.handle();
    }

    return defer(() => from(tenantAls.run(store, () => lastValueFrom(next.handle()))));
  }
}
