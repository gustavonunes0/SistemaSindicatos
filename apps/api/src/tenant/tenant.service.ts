import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Tenant } from '@prisma/client';
import {
  tenantBrandingSchema,
  type AtualizarTenantPlataformaInput,
  type CriarDominioPlataformaInput,
  type TenantBranding,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';

export type TenantResolvido = Pick<
  Tenant,
  'id' | 'slug' | 'nome' | 'tipo' | 'timezone' | 'ativo' | 'branding'
>;

@Injectable()
export class TenantService {
  private readonly cachePorHost = new Map<string, { expires: number; tenant: TenantResolvido | null }>();
  private readonly cacheTtlMs = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  /** Normaliza host: lowercase, sem porta, sem colchetes IPv6. */
  normalizarHost(bruto: string): string {
    let host = bruto.trim().toLowerCase();
    if (host.startsWith('[') && host.includes(']')) {
      host = host.slice(1, host.indexOf(']'));
    } else {
      const colon = host.lastIndexOf(':');
      if (colon > -1 && host.indexOf(':') === colon) {
        host = host.slice(0, colon);
      }
    }
    return host;
  }

  extrairHostDoRequest(headers: Record<string, string | string[] | undefined>): string {
    const header = (nome: string): string | undefined => {
      const v = headers[nome] ?? headers[nome.toLowerCase()];
      if (Array.isArray(v)) return v[0];
      return v;
    };

    const xTenantHost = header('x-tenant-host');
    if (xTenantHost) {
      return this.normalizarHost(xTenantHost);
    }

    const forwarded = header('x-forwarded-host');
    if (forwarded) {
      return this.normalizarHost(forwarded.split(',')[0]!.trim());
    }

    const origin = header('origin');
    if (origin) {
      try {
        return this.normalizarHost(new URL(origin).host);
      } catch {
        /* ignore */
      }
    }

    const host = header('host');
    if (host) {
      return this.normalizarHost(host);
    }

    throw new BadRequestException('Não foi possível determinar o host do tenant');
  }

  async resolverPorHost(hostBruto: string): Promise<TenantResolvido> {
    const host = this.normalizarHost(hostBruto);
    const cached = this.cachePorHost.get(host);
    if (cached && cached.expires > Date.now()) {
      if (!cached.tenant) {
        throw new NotFoundException(`Tenant não encontrado para o host "${host}"`);
      }
      return cached.tenant;
    }

    const domain = await this.prisma.tenantDomain.findUnique({
      where: { host },
      include: { tenant: true },
    });

    const tenant =
      domain?.tenant && domain.tenant.ativo
        ? {
            id: domain.tenant.id,
            slug: domain.tenant.slug,
            nome: domain.tenant.nome,
            tipo: domain.tenant.tipo,
            timezone: domain.tenant.timezone,
            ativo: domain.tenant.ativo,
            branding: domain.tenant.branding,
          }
        : null;

    if (tenant) {
      this.cachePorHost.set(host, { expires: Date.now() + this.cacheTtlMs, tenant });
    } else {
      this.cachePorHost.set(host, { expires: Date.now() + 5_000, tenant: null });
    }

    if (!tenant) {
      throw new NotFoundException(`Tenant não encontrado para o host "${host}"`);
    }
    return tenant;
  }

  async listarSindicatos() {
    return this.prisma.tenant.findMany({
      where: { tipo: 'SINDICATO' },
      orderBy: { nome: 'asc' },
      include: {
        domains: { orderBy: { host: 'asc' } },
        _count: { select: { users: true, afiliados: true } },
      },
    });
  }

  async buscarSindicato(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, tipo: 'SINDICATO' },
      include: {
        domains: { orderBy: { host: 'asc' } },
        _count: { select: { users: true, afiliados: true } },
      },
    });
    if (!tenant) {
      throw new NotFoundException('Sindicato não encontrado');
    }
    return {
      ...tenant,
      branding: this.parseBranding(tenant.branding),
    };
  }

  async atualizarSindicato(id: string, input: AtualizarTenantPlataformaInput) {
    const atual = await this.prisma.tenant.findFirst({
      where: { id, tipo: 'SINDICATO' },
    });
    if (!atual) {
      throw new NotFoundException('Sindicato não encontrado');
    }

    let branding: Prisma.InputJsonValue | undefined;
    if (input.branding) {
      const parsed = tenantBrandingSchema.parse(input.branding);
      branding = parsed as Prisma.InputJsonValue;
    }

    const atualizado = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(input.nome !== undefined ? { nome: input.nome } : {}),
        ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(branding !== undefined ? { branding } : {}),
      },
      include: {
        domains: { orderBy: { host: 'asc' } },
        _count: { select: { users: true, afiliados: true } },
      },
    });

    this.invalidarCache();
    return {
      ...atualizado,
      branding: this.parseBranding(atualizado.branding),
    };
  }

  async adicionarDominio(tenantId: string, input: CriarDominioPlataformaInput) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, tipo: 'SINDICATO' },
    });
    if (!tenant) {
      throw new NotFoundException('Sindicato não encontrado');
    }

    const host = this.normalizarHost(input.host);
    if (!host) {
      throw new BadRequestException('Host inválido');
    }
    if (host.startsWith('sindigest.')) {
      throw new BadRequestException('Host da plataforma não pode ser vinculado a um sindicato');
    }

    const existente = await this.prisma.tenantDomain.findUnique({ where: { host } });
    if (existente) {
      throw new BadRequestException(`Host "${host}" já está cadastrado`);
    }

    if (input.primario) {
      await this.prisma.tenantDomain.updateMany({
        where: { tenantId },
        data: { primario: false },
      });
    }

    const domain = await this.prisma.tenantDomain.create({
      data: {
        tenantId,
        host,
        primario: Boolean(input.primario),
      },
    });

    this.invalidarCache();
    return domain;
  }

  async removerDominio(tenantId: string, domainId: string) {
    const domain = await this.prisma.tenantDomain.findFirst({
      where: { id: domainId, tenantId, tenant: { tipo: 'SINDICATO' } },
    });
    if (!domain) {
      throw new NotFoundException('Domínio não encontrado');
    }

    const total = await this.prisma.tenantDomain.count({ where: { tenantId } });
    if (total <= 1) {
      throw new BadRequestException('O sindicato precisa de ao menos um domínio');
    }

    await this.prisma.tenantDomain.delete({ where: { id: domainId } });

    if (domain.primario) {
      const outro = await this.prisma.tenantDomain.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
      if (outro) {
        await this.prisma.tenantDomain.update({
          where: { id: outro.id },
          data: { primario: true },
        });
      }
    }

    this.invalidarCache();
    return { ok: true };
  }

  async definirDominioPrimario(tenantId: string, domainId: string) {
    const domain = await this.prisma.tenantDomain.findFirst({
      where: { id: domainId, tenantId, tenant: { tipo: 'SINDICATO' } },
    });
    if (!domain) {
      throw new NotFoundException('Domínio não encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.tenantDomain.updateMany({
        where: { tenantId },
        data: { primario: false },
      }),
      this.prisma.tenantDomain.update({
        where: { id: domainId },
        data: { primario: true },
      }),
    ]);

    this.invalidarCache();
    return this.buscarSindicato(tenantId);
  }

  async isAllowedOrigin(origin: string): Promise<boolean> {
    try {
      const host = this.normalizarHost(new URL(origin).host);
      const webUrl = (process.env.WEB_URL ?? '').replace(/\/+$/, '');
      if (webUrl) {
        try {
          if (this.normalizarHost(new URL(webUrl).host) === host) {
            return true;
          }
        } catch {
          /* ignore */
        }
      }

      const extras = (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      for (const extra of extras) {
        try {
          if (this.normalizarHost(new URL(extra).host) === host) {
            return true;
          }
        } catch {
          /* ignore */
        }
      }

      const seedHosts = (process.env.TENANT_SEED_HOSTS ?? '')
        .split(',')
        .map((h) => this.normalizarHost(h.trim()))
        .filter(Boolean);
      if (seedHosts.includes(host)) {
        return true;
      }

      await this.resolverPorHost(host);
      return true;
    } catch {
      return false;
    }
  }

  invalidarCache(): void {
    this.cachePorHost.clear();
  }

  parseBranding(raw: unknown): TenantBranding | null {
    const parsed = tenantBrandingSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  toPublicDto(tenant: TenantResolvido, host: string) {
    return {
      id: tenant.id,
      slug: tenant.slug,
      nome: tenant.nome,
      tipo: tenant.tipo,
      timezone: tenant.timezone,
      host,
      branding: this.parseBranding(tenant.branding),
    };
  }
}
