import { Injectable } from '@nestjs/common';
import type { AdminMetricas } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';

@Injectable()
export class AdminService {
  private readonly cache = new Map<string, { expires: number; payload: AdminMetricas }>();
  private readonly cacheTtlMs = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async metricas(): Promise<AdminMetricas> {
    const tenantId = requireTenantId();
    const cached = this.cache.get(tenantId);
    if (cached && cached.expires > Date.now()) {
      return cached.payload;
    }

    const [
      noticiasTotal,
      noticiasPublicadas,
      conveniosTotal,
      imoveisTotal,
      solicitacoesTotal,
      solicitacoesAbertas,
    ] = await Promise.all([
      this.prisma.noticia.count({ where: { tenantId } }),
      this.prisma.noticia.count({ where: { tenantId, status: 'PUBLICADO' } }),
      this.prisma.convenio.count({ where: { tenantId } }),
      this.prisma.imovel.count({ where: { tenantId } }),
      this.prisma.solicitacaoAluguel.count({ where: { tenantId } }),
      this.prisma.solicitacaoAluguel.count({
        where: { tenantId, status: { in: ['ABERTA', 'EM_ANDAMENTO'] } },
      }),
    ]);

    const payload = {
      noticiasTotal,
      noticiasPublicadas,
      conveniosTotal,
      imoveisTotal,
      solicitacoesTotal,
      solicitacoesAbertas,
    };
    this.cache.set(tenantId, { expires: Date.now() + this.cacheTtlMs, payload });
    return payload;
  }
}
