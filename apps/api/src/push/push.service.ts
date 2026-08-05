import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PushSubscriptionInput } from '@sindprf/types';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';

type PayloadNoticia = {
  titulo: string;
  corpo: string;
  url: string;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private configurado = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.configurarVapid();
  }

  getPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY')?.trim() || null;
  }

  async salvarInscricao(input: PushSubscriptionInput, userAgent?: string): Promise<void> {
    const tenantId = requireTenantId();
    await this.prisma.pushSubscription.upsert({
      where: { tenantId_endpoint: { tenantId, endpoint: input.endpoint } },
      update: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent ?? null,
      },
      create: {
        tenantId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent ?? null,
      },
    });
  }

  async removerInscricao(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async notificarNovaNoticia(noticia: { titulo: string; slug: string }): Promise<void> {
    if (!this.configurado) {
      this.logger.warn('VAPID não configurado — push de notícia ignorado');
      return;
    }

    const inscricoes = await this.prisma.pushSubscription.findMany();
    if (inscricoes.length === 0) {
      this.logger.warn(
        'Nenhum dispositivo inscrito em push — peça para ativar alertas em /noticias',
      );
      return;
    }

    const payload: PayloadNoticia = {
      titulo: 'Nova notícia — SINDPRF-CE',
      corpo: noticia.titulo,
      url: `/noticias/${noticia.slug}`,
    };
    const corpo = JSON.stringify(payload);

    await Promise.all(
      inscricoes.map(async (inscricao) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: inscricao.endpoint,
              keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
            },
            corpo,
          );
        } catch (error) {
          const status =
            typeof error === 'object' && error !== null && 'statusCode' in error
              ? Number((error as { statusCode: number }).statusCode)
              : undefined;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: inscricao.id } });
            return;
          }
          this.logger.warn(`Falha ao enviar push (${inscricao.id}): ${String(error)}`);
        }
      }),
    );

    this.logger.log(`Push enviado para ${inscricoes.length} inscrição(ões)`);
  }

  private configurarVapid(): void {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const subject = this.config.get<string>('VAPID_SUBJECT')?.trim() || 'mailto:sindprfce@sindprfce.com.br';

    if (!publicKey || !privateKey) {
      this.logger.warn('Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY para ativar push');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configurado = true;
  }
}
