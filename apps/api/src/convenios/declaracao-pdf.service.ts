import { Injectable } from '@nestjs/common';
import type { ModeloDeclaracao } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const CNPJ = '41.410.325/0001-20';
const PRESIDENTE = 'Tatiane Vasques Monteiro';
const NOME_COMPLETO =
  'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará — SINDPRF-CE';

const dataFmt = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Fortaleza',
});

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Fortaleza',
});

export type DadosDeclaracaoPdf = {
  modelo: ModeloDeclaracao;
  destino: string;
  textoComplementar: string | null;
  afiliadoNome: string;
  afiliadoCpf: string;
  dependenteNome?: string;
  dependenteCpf?: string;
  periodoInicio?: Date;
  periodoFim?: Date;
  /** URL absoluta da página pública de validação (QR Code). */
  urlValidacao: string;
  codigoValidacao: string;
};

function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '').padStart(11, '0').slice(-11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function caminhoAsset(nome: string): string | null {
  const candidatos = [
    join(process.cwd(), 'assets', nome),
    join(process.cwd(), 'apps', 'api', 'assets', nome),
    join(process.cwd(), '..', 'web', 'public', nome),
    join(process.cwd(), 'apps', 'web', 'public', nome),
  ];
  return candidatos.find((c) => existsSync(c)) ?? null;
}

@Injectable()
export class DeclaracaoPdfService {
  async gerar(dados: DadosDeclaracaoPdf): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: dados.modelo === 'AUTORIZACAO_HOSPEDAGEM' ? 'Autorização SINDPRF-CE' : 'Declaração SINDPRF-CE',
        Author: NOME_COMPLETO,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pronto = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.desenharLogo(doc);
    this.desenharTitulo(doc, dados);
    this.desenharCorpo(doc, dados);
    this.desenharDataLocal(doc);
    this.desenharAssinatura(doc);
    await this.desenharValidacaoQr(doc, dados);

    doc.end();
    return pronto;
  }

  private desenharLogo(doc: PDFKit.PDFDocument): void {
    const logoPath = caminhoAsset('logo-sindicato.png');
    if (!logoPath) return;

    try {
      const img = readFileSync(logoPath);
      const tamanho = 90;
      const x = doc.page.width / 2 - tamanho / 2;
      const y = doc.y;
      doc.image(img, x, y, { fit: [tamanho, tamanho] });
      doc.y = y + tamanho + 28;
    } catch {
      // segue sem logo
    }
  }

  private desenharTitulo(doc: PDFKit.PDFDocument, dados: DadosDeclaracaoPdf): void {
    const titulo =
      dados.modelo === 'AUTORIZACAO_HOSPEDAGEM' ? 'AUTORIZAÇÃO' : 'DECLARAÇÃO';

    doc
      .font('Times-Bold')
      .fontSize(18)
      .fillColor('#000000')
      .text(titulo, { align: 'center' });

    doc.moveDown(2);
  }

  private desenharCorpo(doc: PDFKit.PDFDocument, dados: DadosDeclaracaoPdf): void {
    doc.font('Times-Roman').fontSize(12).fillColor('#000000');

    const corpo = this.montarTexto(dados);
    doc.text(corpo, {
      align: 'justify',
      lineGap: 6,
      paragraphGap: 8,
    });

    if (dados.textoComplementar?.trim()) {
      doc.moveDown(0.8).text(dados.textoComplementar.trim(), {
        align: 'justify',
        lineGap: 6,
      });
    }
  }

  private montarTexto(dados: DadosDeclaracaoPdf): string {
    const nome = dados.afiliadoNome.toUpperCase();
    const cpf = formatarCpf(dados.afiliadoCpf);
    const destino = dados.destino.trim();

    if (dados.modelo === 'DEPENDENTE') {
      const depNome = (dados.dependenteNome ?? '').toUpperCase();
      const depCpf = formatarCpf(dados.dependenteCpf ?? '');
      return (
        `Declaro, para fins de comprovação junto a ${destino}, nos termos do convênio ` +
        `firmado entre as partes, que ${depNome}, portador(a) do CPF Nº ${depCpf}, ` +
        `é dependente do associado do SINDPRF-CE, ${nome}, portador(a) do CPF Nº ${cpf}.`
      );
    }

    if (dados.modelo === 'AUTORIZACAO_HOSPEDAGEM') {
      const inicio = dados.periodoInicio ? dataCurta.format(dados.periodoInicio) : '____/____/______';
      const fim = dados.periodoFim ? dataCurta.format(dados.periodoFim) : '____/____/______';
      return (
        `O ${NOME_COMPLETO}, sócio proprietário do ${destino}, neste ato representado pela ` +
        `sua presidente, ${PRESIDENTE}, autoriza o(a) Sr(a). ${nome}, CPF Nº ${cpf}, ` +
        `associado(a) do SINDPRF-CE, a usufruir de 01 (uma) acomodação no período de ` +
        `${inicio} a ${fim}, o(a) qual se responsabilizará por quaisquer danos, prejuízos ` +
        `ou contas não pagas no Hotel/Restaurante que por ventura venha a ocorrer.`
      );
    }

    return (
      `DECLARO, para fins de comprovação junto ${destino}, nos Termos do Convênio ` +
      `firmado entre as partes, que ${nome}, CPF Nº ${cpf}, é associado(a) do SINDPRF-CE.`
    );
  }

  private desenharDataLocal(doc: PDFKit.PDFDocument): void {
    const hoje = dataFmt.format(new Date());
    doc.moveDown(2).font('Times-Roman').fontSize(12).fillColor('#000000');
    doc.text(`Fortaleza, ${hoje}.`, { align: 'left' });
  }

  private desenharAssinatura(doc: PDFKit.PDFDocument): void {
    doc.moveDown(3);
    const assinaturaPath = caminhoAsset('assinatura-presidente.png');
    const centroX = doc.page.width / 2;

    if (assinaturaPath) {
      try {
        const img = readFileSync(assinaturaPath);
        const largura = 160;
        const x = centroX - largura / 2;
        const y = doc.y;
        doc.image(img, x, y, { width: largura });
        doc.y = y + 55;
      } catch {
        // segue só com o bloco de texto
      }
    }

    doc
      .font('Times-Bold')
      .fontSize(12)
      .fillColor('#000000')
      .text(PRESIDENTE, { align: 'center' });

    doc
      .font('Times-Roman')
      .fontSize(11)
      .text('Presidente do SINDPRF-CE', { align: 'center' })
      .text(`CNPJ ${CNPJ}`, { align: 'center' });
  }

  private async desenharValidacaoQr(
    doc: PDFKit.PDFDocument,
    dados: DadosDeclaracaoPdf,
  ): Promise<void> {
    const qrPng = await QRCode.toBuffer(dados.urlValidacao, {
      type: 'png',
      width: 140,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    const margemEsq = doc.page.margins.left;
    const margemDir = doc.page.margins.right;
    const larguraUtil = doc.page.width - margemEsq - margemDir;
    const qrSize = 88;
    const blocoAltura = 108;
    const yBase = doc.page.height - doc.page.margins.bottom - blocoAltura;

    // Garante espaço: se a assinatura invadiu a área do QR, nova página.
    if (doc.y > yBase - 12) {
      doc.addPage();
    }

    const y = Math.max(doc.y + 28, yBase);

    doc
      .moveTo(margemEsq, y)
      .lineTo(margemEsq + larguraUtil, y)
      .strokeColor('#c8cdd4')
      .lineWidth(0.5)
      .stroke();

    const yConteudo = y + 12;
    doc.image(qrPng, margemEsq, yConteudo, { width: qrSize, height: qrSize });

    const textoX = margemEsq + qrSize + 14;
    const textoLargura = larguraUtil - qrSize - 14;

    doc
      .font('Times-Bold')
      .fontSize(10)
      .fillColor('#0b3d6b')
      .text('Validação online', textoX, yConteudo, { width: textoLargura });

    doc
      .font('Times-Roman')
      .fontSize(9)
      .fillColor('#1a1d23')
      .text(
        'O estabelecimento pode escanear este QR Code para confirmar a autenticidade desta declaração no site do SINDPRF-CE.',
        textoX,
        doc.y + 4,
        { width: textoLargura, lineGap: 2 },
      );

    doc
      .font('Times-Roman')
      .fontSize(8)
      .fillColor('#5a6472')
      .text(`Código: ${dados.codigoValidacao}`, textoX, doc.y + 6, {
        width: textoLargura,
      });
  }
}
