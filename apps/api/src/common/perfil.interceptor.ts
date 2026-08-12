import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, defer, from, lastValueFrom } from 'rxjs';
import { limiteLogMs, novoPerfil, perfilAls } from './perfil-requisicao';

/**
 * Loga requisições lentas separando tempo de banco de tempo de aplicação.
 * Sem isso a única informação disponível é "demorou", sem dizer onde.
 */
@Injectable()
export class PerfilInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Perf');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const perfil = novoPerfil();
    const inicio = process.hrtime.bigint();

    return defer(() =>
      from(
        perfilAls.run(perfil, async () => {
          try {
            return await lastValueFrom(next.handle());
          } finally {
            const totalMs = Number(process.hrtime.bigint() - inicio) / 1_000_000;
            if (totalMs >= limiteLogMs()) {
              const banco = Math.round(perfil.msBanco);
              const app = Math.round(totalMs - perfil.msBanco);
              this.logger.warn(
                `${req.method} ${req.originalUrl} ${Math.round(totalMs)}ms ` +
                  `(banco ${banco}ms em ${perfil.consultas} consultas, app ${app}ms) ` +
                  `mais lenta: ${perfil.operacaoMaisLenta ?? '-'} ${Math.round(perfil.msMaiorConsulta)}ms`,
              );
            }
          }
        }),
      ),
    );
  }
}
