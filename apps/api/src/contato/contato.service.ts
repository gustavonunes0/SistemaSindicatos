import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CONTATO_ASSUNTO_ROTULO,
  tenantBrandingSchema,
  type EnviarContatoInput,
  type EnviarContatoResultado,
} from '@sindprf/types';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantContext, requireTenantId } from '../tenant/tenant-context';

@Injectable()
export class ContatoService {
  private readonly logger = new Logger(ContatoService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async enviar(input: EnviarContatoInput): Promise<EnviarContatoResultado> {
    const destino = await this.resolverDestino();
    const marcaNome = getTenantContext()?.nome ?? 'Site';
    const assuntoRotulo = CONTATO_ASSUNTO_ROTULO[input.assunto];
    const assuntoEmail = `[Site] ${assuntoRotulo} — ${input.nome}`;
    const corpoTexto = [
      `Nome: ${input.nome}`,
      `E-mail: ${input.email}`,
      `Telefone: ${input.telefone ?? 'não informado'}`,
      `Assunto: ${assuntoRotulo}`,
      '',
      input.mensagem,
    ].join('\n');
    const corpoHtml = `
      <p><strong>Nome:</strong> ${escaparHtml(input.nome)}</p>
      <p><strong>E-mail:</strong> ${escaparHtml(input.email)}</p>
      <p><strong>Telefone:</strong> ${escaparHtml(input.telefone ?? 'não informado')}</p>
      <p><strong>Assunto:</strong> ${escaparHtml(assuntoRotulo)}</p>
      <hr />
      <p>${escaparHtml(input.mensagem).replace(/\n/g, '<br />')}</p>
    `;

    const resendKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (resendKey) {
      await this.enviarResend({
        apiKey: resendKey,
        destino,
        marcaNome,
        input,
        assuntoEmail,
        corpoTexto,
        corpoHtml,
      });
      return {
        enviado: true,
        modo: 'resend',
        message: 'Mensagem enviada. Responderemos no e-mail informado.',
      };
    }

    const smtpHost = this.config.get<string>('SMTP_HOST')?.trim();
    if (smtpHost) {
      await this.enviarSmtp({
        destino,
        marcaNome,
        input,
        assuntoEmail,
        corpoTexto,
        corpoHtml,
        smtpHost,
      });
      return {
        enviado: true,
        modo: 'smtp',
        message: 'Mensagem enviada. Responderemos no e-mail informado.',
      };
    }

    this.logger.error(
      `Contato sem provedor de e-mail. Configure RESEND_API_KEY (gratuito) ou SMTP_*. Destino=${destino}`,
    );
    throw new ServiceUnavailableException(
      'O envio por e-mail ainda não está configurado. Use telefone ou o e-mail ao lado.',
    );
  }

  private async enviarResend(params: {
    apiKey: string;
    destino: string;
    marcaNome: string;
    input: EnviarContatoInput;
    assuntoEmail: string;
    corpoTexto: string;
    corpoHtml: string;
  }): Promise<void> {
    const from =
      this.config.get<string>('RESEND_FROM')?.trim() ||
      `${params.marcaNome} <onboarding@resend.dev>`;

    try {
      const resposta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.destino],
          reply_to: params.input.email,
          subject: params.assuntoEmail,
          text: params.corpoTexto,
          html: params.corpoHtml,
        }),
      });

      if (!resposta.ok) {
        const detalhe = await resposta.text();
        this.logger.error(`Resend HTTP ${resposta.status}: ${detalhe}`);
        throw new Error(`Resend falhou (${resposta.status})`);
      }
    } catch (erro) {
      this.logger.error('Falha ao enviar e-mail via Resend', erro);
      throw new ServiceUnavailableException(
        'Não foi possível enviar o e-mail agora. Tente pelos canais ao lado ou mais tarde.',
      );
    }
  }

  private async enviarSmtp(params: {
    destino: string;
    marcaNome: string;
    input: EnviarContatoInput;
    assuntoEmail: string;
    corpoTexto: string;
    corpoHtml: string;
    smtpHost: string;
  }): Promise<void> {
    const porta = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const usuario = this.config.get<string>('SMTP_USER')?.trim();
    const senha = this.config.get<string>('SMTP_PASS')?.trim();
    const remetente =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      usuario ||
      `noreply@${params.smtpHost}`;

    try {
      const transporter = nodemailer.createTransport({
        host: params.smtpHost,
        port: porta,
        secure: porta === 465,
        auth: usuario && senha ? { user: usuario, pass: senha } : undefined,
      });

      await transporter.sendMail({
        from: `"${params.marcaNome}" <${remetente}>`,
        to: params.destino,
        replyTo: `"${params.input.nome}" <${params.input.email}>`,
        subject: params.assuntoEmail,
        text: params.corpoTexto,
        html: params.corpoHtml,
      });
    } catch (erro) {
      this.logger.error('Falha ao enviar e-mail de contato via SMTP', erro);
      throw new ServiceUnavailableException(
        'Não foi possível enviar o e-mail agora. Tente pelos canais ao lado ou mais tarde.',
      );
    }
  }

  private async resolverDestino(): Promise<string> {
    const override = this.config.get<string>('CONTATO_DESTINO_EMAIL')?.trim();
    if (override) return override;

    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { branding: true },
    });
    const branding = tenantBrandingSchema.safeParse(tenant?.branding);
    if (branding.success) {
      return branding.data.contatoDestinoEmail ?? branding.data.contato.email;
    }
    return 'sindprfce@sindprfce.com.br';
  }
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
