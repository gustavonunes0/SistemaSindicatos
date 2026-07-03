import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { InstagramPost } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { FEED_MOCK } from './instagram.mock';

const GRAPH_URL = 'https://graph.instagram.com';
const FEED_LIMITE = 12;

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

  // Token em memória: pode ser rotacionado pelo job de refresh sem reiniciar a api.
  private accessToken: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.accessToken = config.get<string>('INSTAGRAM_ACCESS_TOKEN');
    this.userId = config.get<string>('INSTAGRAM_USER_ID');
    this.mockAtivo = config.get<string>('INSTAGRAM_MOCK') === 'true';
  }

  private get configurado(): boolean {
    return Boolean(this.accessToken && this.userId);
  }

  onModuleInit(): void {
    // Sincronização inicial em background; falha não impede o boot.
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

    try {
      const campos = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
      const url = `${GRAPH_URL}/${this.userId}/media?fields=${campos}&limit=${FEED_LIMITE}&access_token=${this.accessToken}`;
      const resposta = await fetch(url);
      if (!resposta.ok) {
        throw new Error(`Graph API respondeu ${resposta.status}`);
      }

      const { data } = (await resposta.json()) as { data: GraphMediaItem[] };
      for (const item of data) {
        // Vídeos usam a thumbnail como imagem do grid.
        const mediaUrl = (item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url) ?? '';
        if (!mediaUrl) {
          continue;
        }
        await this.prisma.instagramPost.upsert({
          where: { externalId: item.id },
          update: {
            mediaUrl,
            permalink: item.permalink,
            caption: item.caption ?? null,
            mediaType: item.media_type,
            sincronizado: new Date(),
          },
          create: {
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
      // Falha de sync não pode derrubar a api; o feed continua servindo o cache.
      this.logger.error(`Erro ao sincronizar Instagram: ${(error as Error).message}`);
    }
  }

  // Long-lived tokens expiram em 60 dias; renovação semanal mantém folga.
  @Cron(CronExpression.EVERY_WEEK)
  async renovarToken(): Promise<void> {
    if (!this.configurado) {
      return;
    }

    try {
      const url = `${GRAPH_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.accessToken}`;
      const resposta = await fetch(url);
      if (!resposta.ok) {
        throw new Error(`Graph API respondeu ${resposta.status}`);
      }

      const { access_token: novoToken } = (await resposta.json()) as { access_token: string };
      this.accessToken = novoToken;
      this.logger.warn(
        'Token do Instagram renovado em memória — atualize INSTAGRAM_ACCESS_TOKEN no .env para persistir após reinício',
      );
    } catch (error) {
      this.logger.error(`Erro ao renovar token do Instagram: ${(error as Error).message}`);
    }
  }
}
