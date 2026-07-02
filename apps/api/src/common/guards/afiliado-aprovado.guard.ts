import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../request-user';

// Rotas restritas de afiliado exigem status APROVADO, não só autenticação.
@Injectable()
export class AfiliadoAprovadoGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }

    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });
    if (afiliado?.status !== 'APROVADO') {
      throw new ForbiddenException('Afiliação ainda não aprovada');
    }
    return true;
  }
}
