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

    const smtpHost = this.config.get<string>('SMTP_HOST')?.trim();
    if (!smtpHost) {
      this.logger.warn(
        `Contato sem SMTP configurado. Destino=${destino} De=${input.email} Assunto=${assuntoEmail}`,
      );
      this.logger.log(corpoTexto);
      return {
        enviado: true,
        modo: 'registrado',
        message: 'Mensagem recebida. Entraremos em contato em breve.',
      };
    }

    const porta = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const usuario = this.config.get<string>('SMTP_USER')?.trim();
    const senha = this.config.get<string>('SMTP_PASS')?.trim();
    const remetente =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      usuario ||
      `noreply@${smtpHost}`;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: porta,
        secure: porta === 465,
        auth: usuario && senha ? { user: usuario, pass: senha } : undefined,
      });

      await transporter.sendMail({
        from: `"${marcaNome}" <${remetente}>`,
        to: destino,
        replyTo: `"${input.nome}" <${input.email}>`,
        subject: assuntoEmail,
        text: corpoTexto,
        html: `
          <p><strong>Nome:</strong> ${escaparHtml(input.nome)}</p>
          <p><strong>E-mail:</strong> ${escaparHtml(input.email)}</p>
          <p><strong>Telefone:</strong> ${escaparHtml(input.telefone ?? 'não informado')}</p>
          <p><strong>Assunto:</strong> ${escaparHtml(assuntoRotulo)}</p>
          <hr />
          <p>${escaparHtml(input.mensagem).replace(/\n/g, '<br />')}</p>
        `,
      });

      return {
        enviado: true,
        modo: 'smtp',
        message: 'Mensagem enviada. Responderemos no e-mail informado.',
      };
    } catch (erro) {
      this.logger.error('Falha ao enviar e-mail de contato', erro);
      throw new ServiceUnavailableException(
        'Não foi possível enviar o e-mail agora. Tente pelos canais ao lado ou mais tarde.',
      );
    }
  }

  private async resolverDestino(): Promise<string> {
    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { branding: true },
    });
    const branding = tenantBrandingSchema.safeParse(tenant?.branding);
    if (branding.success) {
      return branding.data.contatoDestinoEmail ?? branding.data.contato.email;
    }
    return (
      this.config.get<string>('CONTATO_DESTINO_EMAIL')?.trim() || 'sindprfce@sindprfce.com.br'
    );
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
