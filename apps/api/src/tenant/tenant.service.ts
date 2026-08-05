import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Tenant } from '@prisma/client';
import { tenantBrandingSchema, type TenantBranding } from '@sindprf/types';
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
