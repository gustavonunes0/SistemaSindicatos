import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@sindprf/types';
import { ROLES_KEY } from '../decorators';
import type { RequestUser } from '../request-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesExigidas = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesExigidas || rolesExigidas.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }
    if (rolesExigidas.includes(user.role)) {
      return true;
    }
    // Admin pode pré-visualizar endpoints da área do filiado.
    if (user.role === 'ADMIN' && rolesExigidas.includes('AFILIADO')) {
      return true;
    }
    throw new ForbiddenException('Acesso negado');
  }
}
