import { Injectable } from '@nestjs/common';
import type { AdminMetricas } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async metricas(): Promise<AdminMetricas> {
    const [
      noticiasTotal,
      noticiasPublicadas,
      conveniosTotal,
      imoveisTotal,
      solicitacoesTotal,
      solicitacoesAbertas,
    ] = await this.prisma.$transaction([
      this.prisma.noticia.count(),
      this.prisma.noticia.count({ where: { status: 'PUBLICADO' } }),
      this.prisma.convenio.count(),
      this.prisma.imovel.count(),
      this.prisma.solicitacaoAluguel.count(),
      this.prisma.solicitacaoAluguel.count({
        where: { status: { in: ['ABERTA', 'EM_ANDAMENTO'] } },
      }),
    ]);

    return {
      noticiasTotal,
      noticiasPublicadas,
      conveniosTotal,
      imoveisTotal,
      solicitacoesTotal,
      solicitacoesAbertas,
    };
  }
}
