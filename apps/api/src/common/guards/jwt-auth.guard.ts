import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { RequestComTenant } from '../../tenant/tenant.middleware';
import { IS_PUBLIC_KEY } from '../decorators';
import type { JwtPayload, RequestUser } from '../request-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestComTenant & { user?: RequestUser }>();
    const token = this.extrairToken(request);

    if (isPublic) {
      if (token) {
        try {
          await this.aplicarPayload(request, token);
        } catch {
          // Token inválido em rota pública: segue anônimo.
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    await this.aplicarPayload(request, token);
    return true;
  }

  private async aplicarPayload(
    request: RequestComTenant & { user?: RequestUser },
    token: string,
  ): Promise<void> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    if (request.tenant && payload.tenantId !== request.tenant.tenantId) {
      throw new ForbiddenException('Token não pertence a este sindicato');
    }

    request.user = {
      id: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }

  private extrairToken(request: Request): string | undefined {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' ? token : undefined;
  }
}
