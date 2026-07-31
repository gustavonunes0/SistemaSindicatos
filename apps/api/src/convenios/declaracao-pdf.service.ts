import { Injectable } from '@nestjs/common';
import type { ModeloDeclaracao } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';

const CNPJ = '41.410.325/0001-20';
const PRESIDENTE = 'Tatiane Vasques Monteiro';
const NOME_COMPLETO =
  'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará — SINDPRF-CE';
const EMAIL = 'sindprfce@sindprfce.com.br';

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
};

function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '').padStart(11, '0').slice(-11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function caminhoAssinatura(): string | null {
  const candidatos = [
    join(process.cwd(), 'assets', 'assinatura-presidente.png'),
    join(process.cwd(), 'apps', 'api', 'assets', 'assinatura-presidente.png'),
  ];
  return candidatos.find((c) => existsSync(c)) ?? null;
}

@Injectable()
export class DeclaracaoPdfService {
  async gerar(dados: DadosDeclaracaoPdf): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 64, bottom: 64, left: 64, right: 64 },
      info: {
        Title: 'Declaração SINDPRF-CE',
        Author: NOME_COMPLETO,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pronto = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.desenharCabecalho(doc);
    this.desenharCorpo(doc, dados);
    this.desenharDataLocal(doc);
    this.desenharAssinatura(doc);

    doc.end();
    return pronto;
  }

  private desenharCabecalho(doc: PDFKit.PDFDocument): void {
    doc
      .fillColor('#0f3d6b')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(NOME_COMPLETO.toUpperCase(), { align: 'center' });

    doc
      .moveDown(0.3)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#334155')
      .text(`CNPJ ${CNPJ}`, { align: 'center' });

    doc
      .moveDown(0.8)
      .strokeColor('#e8b923')
      .lineWidth(3)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();

    doc.moveDown(1.4);
  }

  private desenharCorpo(doc: PDFKit.PDFDocument, dados: DadosDeclaracaoPdf): void {
    const titulo =
      dados.modelo === 'AUTORIZACAO_HOSPEDAGEM' ? 'AUTORIZAÇÃO' : 'DECLARAÇÃO';

    doc
      .fillColor('#0f3d6b')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(titulo, { align: 'center' });

    doc.moveDown(1.2).fillColor('#1e293b').font('Helvetica').fontSize(11);

    const corpo = this.montarTexto(dados);
    doc.text(corpo, { align: 'justify', lineGap: 4 });

    if (dados.textoComplementar?.trim()) {
      doc.moveDown(0.8).text(dados.textoComplementar.trim(), {
        align: 'justify',
        lineGap: 4,
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
        `firmado entre as partes, que ${depNome}, portador(a) do CPF nº ${depCpf}, ` +
        `é dependente do associado do SINDPRF-CE, ${nome}, portador(a) do CPF nº ${cpf}.`
      );
    }

    if (dados.modelo === 'AUTORIZACAO_HOSPEDAGEM') {
      const inicio = dados.periodoInicio ? dataCurta.format(dados.periodoInicio) : '____/____/______';
      const fim = dados.periodoFim ? dataCurta.format(dados.periodoFim) : '____/____/______';
      return (
        `O ${NOME_COMPLETO}, sócio proprietário do ${destino}, neste ato representado pela ` +
        `sua presidente, ${PRESIDENTE}, autoriza o(a) Sr(a). ${nome}, CPF nº ${cpf}, ` +
        `associado(a) do SINDPRF-CE, a usufruir de 01 (uma) acomodação no período de ` +
        `${inicio} a ${fim}, o(a) qual se responsabilizará por quaisquer danos, prejuízos ` +
        `ou contas não pagas no Hotel/Restaurante que por ventura venha a ocorrer.`
      );
    }

    return (
      `O ${NOME_COMPLETO}, CNPJ ${CNPJ}, representado pela sua Presidente ${PRESIDENTE}, ` +
      `DECLARA, para fins de comprovação junto a ${destino}, nos termos do convênio ` +
      `firmado entre as partes, que ${nome}, portador(a) do CPF nº ${cpf}, ` +
      `é associado(a)/filiado(a) a esta entidade sindical.`
    );
  }

  private desenharDataLocal(doc: PDFKit.PDFDocument): void {
    const hoje = dataFmt.format(new Date());
    doc.moveDown(1.4).font('Helvetica').fontSize(11).fillColor('#1e293b');
    doc.text(`Fortaleza, ${hoje}.`, { align: 'right' });
  }

  private desenharAssinatura(doc: PDFKit.PDFDocument): void {
    doc.moveDown(2.2);
    const assinaturaPath = caminhoAssinatura();
    const centroX = doc.page.width / 2;

    if (assinaturaPath) {
      try {
        const img = readFileSync(assinaturaPath);
        const largura = 160;
        const x = centroX - largura / 2;
        doc.image(img, x, doc.y, { width: largura });
        doc.moveDown(0.2);
        doc.y += 48;
      } catch {
        // segue com linha de assinatura
      }
    }

    const linhaY = doc.y + 8;
    doc
      .strokeColor('#0f3d6b')
      .lineWidth(1)
      .moveTo(centroX - 110, linhaY)
      .lineTo(centroX + 110, linhaY)
      .stroke();

    doc
      .moveDown(1)
      .fillColor('#0f3d6b')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(PRESIDENTE.toUpperCase(), { align: 'center' });

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#334155')
      .text('Presidente do SINDPRF-CE', { align: 'center' })
      .text(`CNPJ ${CNPJ}`, { align: 'center' })
      .text(EMAIL, { align: 'center' });
  }
}
