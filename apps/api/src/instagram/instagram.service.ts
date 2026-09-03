import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { InstagramPost } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { runWithTenantAsync, requireTenantId } from '../tenant/tenant-context';
import { FEED_MOCK } from './instagram.mock';

const FEED_LIMITE = 12;
const CAMPOS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

/** Instagram Login usa graph.instagram.com; token de Página/Facebook usa graph.facebook.com. */
const GRAPH_BASES = [
  'https://graph.instagram.com',
  'https://graph.facebook.com/v21.0',
] as const;

interface GraphMediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

@Injectable()
export class InstagramService implements OnModuleInit {
  private readonly logger = new Logger(InstagramService.name);
  private readonly userId: string | undefined;
  private readonly mockAtivo: boolean;
  private accessToken: string | undefined;
  private graphBase: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.accessToken = config.get<string>('INSTAGRAM_ACCESS_TOKEN')?.trim() || undefined;
    this.userId = config.get<string>('INSTAGRAM_USER_ID')?.trim() || undefined;
    this.mockAtivo = config.get<string>('INSTAGRAM_MOCK') === 'true';
  }

  private get configurado(): boolean {
    return Boolean(this.accessToken && this.userId);
  }

  onModuleInit(): void {
    void this.sincronizar();
  }

  async feed(): Promise<InstagramPost[]> {
    const posts = await this.prisma.instagramPost.findMany({
      orderBy: { publicadoEm: 'desc' },
      take: FEED_LIMITE,
    });

    if (posts.length === 0 && this.mockAtivo) {
      return FEED_MOCK;
    }

    return posts.map((post) => ({
      id: post.externalId,
      mediaUrl: post.mediaUrl,
      permalink: post.permalink,
      caption: post.caption,
      mediaType: post.mediaType,
      publicadoEm: post.publicadoEm,
    }));
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sincronizar(): Promise<void> {
    if (!this.configurado) {
      this.logger.debug('Instagram não configurado — sincronização ignorada');
      return;
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { ativo: true, tipo: 'SINDICATO' },
    });
    for (const tenant of tenants) {
      await runWithTenantAsync(
        {
          tenantId: tenant.id,
          slug: tenant.slug,
          host: '',
          timezone: tenant.timezone,
          nome: tenant.nome,
        },
        () => this.sincronizarNoTenant(),
      );
    }
  }

  private async sincronizarNoTenant(): Promise<void> {
    try {
      const data = await this.buscarMedia();
      const tenantId = requireTenantId();
      for (const item of data) {
        const mediaUrl = (item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url) ?? '';
        if (!mediaUrl) continue;

        await this.prisma.instagramPost.upsert({
          where: { tenantId_externalId: { tenantId, externalId: item.id } },
          update: {
            mediaUrl,
            permalink: item.permalink,
            caption: item.caption ?? null,
            mediaType: item.media_type,
            sincronizado: new Date(),
          },
          create: {
            tenantId,
            externalId: item.id,
            mediaUrl,
            permalink: item.permalink,
            caption: item.caption ?? null,
            mediaType: item.media_type,
            publicadoEm: new Date(item.timestamp),
          },
        });
      }
      this.logger.log(`Feed do Instagram sincronizado (${data.length} posts)`);
    } catch (error) {
      this.logger.error(`Erro ao sincronizar Instagram: ${(error as Error).message}`);
    }
  }

  private async buscarMedia(): Promise<GraphMediaItem[]> {
    const bases = this.graphBase
      ? [this.graphBase, ...GRAPH_BASES.filter((base) => base !== this.graphBase)]
      : this.basesPreferidas();

    const erros: string[] = [];
    for (const base of bases) {
      const url = `${base}/${this.userId}/media?fields=${CAMPOS}&limit=${FEED_LIMITE}&access_token=${this.accessToken}`;
      const resposta = await fetch(url);
      const corpo = await resposta.text();

      if (resposta.ok) {
        this.graphBase = base;
        const json = JSON.parse(corpo) as { data?: GraphMediaItem[] };
        return json.data ?? [];
      }

      erros.push(`${base} → ${resposta.status} ${resumirErroGraph(corpo)}`);
    }

    throw new Error(erros.join(' | '));
  }

  private basesPreferidas(): string[] {
    const token = this.accessToken ?? '';
    if (token.startsWith('EAA')) {
      return ['https://graph.facebook.com/v21.0', 'https://graph.instagram.com'];
    }
    return [...GRAPH_BASES];
  }

  @Cron(CronExpression.EVERY_WEEK)
  async renovarToken(): Promise<void> {
    if (!this.configurado) return;

    try {
      const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.accessToken}`;
      const resposta = await fetch(url);
      const corpo = await resposta.text();
      if (!resposta.ok) {
        throw new Error(resumirErroGraph(corpo));
      }

      const { access_token: novoToken } = JSON.parse(corpo) as { access_token: string };
      this.accessToken = novoToken;
      this.logger.warn(
        'Token do Instagram renovado em memória — atualize INSTAGRAM_ACCESS_TOKEN no .env para persistir após reinício',
      );
    } catch (error) {
      this.logger.error(`Erro ao renovar token do Instagram: ${(error as Error).message}`);
    }
  }
}

function resumirErroGraph(corpo: string): string {
  try {
    const json = JSON.parse(corpo) as {
      error?: { message?: string; type?: string; code?: number; error_subcode?: number };
    };
    const erro = json.error;
    if (!erro) return corpo.slice(0, 300);
    return [erro.type, erro.code, erro.error_subcode, erro.message].filter(Boolean).join(' — ');
  } catch {
    return corpo.slice(0, 300);
  }
}
