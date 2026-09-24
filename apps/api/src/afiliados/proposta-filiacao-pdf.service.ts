import { Injectable } from '@nestjs/common';
import { ESTADO_CIVIL_ROTULO, type EstadoCivil } from '@sindprf/types';
import PDFDocument from 'pdfkit';

const VAGAS_DEPENDENTES = 5;

const DECLARACAO =
  'Declaro aceitar as condições constantes do Estatuto do SINDPRF-CE, comprometendo-me a cumpri-las e fazer com que sejam cumpridas na esfera da minha responsabilidade, autorizando, inclusive, o desconto em folha de pagamento, da mensalidade social em favor do Sindicato dos Policiais Rodoviários Federais no Estado do Ceará, decidido em Assembléia.';

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Fortaleza',
});

export type DependenteProposta = {
  nome: string;
  parentesco: string;
  dataNascimento: Date;
};

export type DadosPropostaFiliacao = {
  nome: string;
  matricula: string;
  cpf: string;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  naturalidade: string | null;
  estadoCivil: EstadoCivil | null;
  dataNascimento: Date | null;
  rg: string | null;
  orgaoExpedidor: string | null;
  lotacaoSiape: string | null;
  lotacaoAtividade: string | null;
  dataAdmissao: Date | null;
  nomeMae: string | null;
  nomePai: string | null;
  telefone: string | null;
  celular: string | null;
  celular2: string | null;
  email: string;
  emailFuncional: string | null;
  conjuge: string | null;
  instituidorPensao: string | null;
  emitidaEm: Date;
  dependentes: DependenteProposta[];
};

function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function formatarCpf(cpf: string): string {
  const digitos = somenteDigitos(cpf).padStart(11, '0').slice(-11);
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarCep(cep: string | null): string | null {
  if (!cep) return null;
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return cep;
  return digitos.replace(/(\d{5})(\d{3})/, '$1-$2');
}

function formatarTelefone(numero: string | null): string | null {
  if (!numero) return null;
  const digitos = somenteDigitos(numero);
  if (digitos.length === 11) return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digitos.length === 10) return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return numero;
}

function formatarData(data: Date | null): string | null {
  if (!data) return null;
  return dataCurta.format(data);
}

function dataPorExtenso(data: Date): string {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Fortaleza',
  }).formatToParts(data);
  const dia = partes.find((parte) => parte.type === 'day')?.value ?? '';
  const mes = partes.find((parte) => parte.type === 'month')?.value ?? '';
  const ano = partes.find((parte) => parte.type === 'year')?.value ?? '';
  return `Fortaleza (CE), ${dia} de ${mes} de ${ano}`;
}

function lotacao(dados: DadosPropostaFiliacao): string | null {
  const siape = dados.lotacaoSiape?.trim();
  const atividade = dados.lotacaoAtividade?.trim();
  if (siape && atividade && siape !== atividade) return `${siape} / ${atividade}`;
  return siape || atividade || null;
}

function nomeArquivoSeguro(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `proposta-filiacao-${base || 'afiliado'}.pdf`;
}

type Doc = PDFKit.PDFDocument;

function desenharCampo(doc: Doc, x: number, y: number, largura: number, rotulo: string, valor: string | null): number {
  const texto = valor?.trim() ?? '';
  doc.font('Helvetica-Bold').fontSize(8.5);
  const rotuloLargura = doc.widthOfString(rotulo) + 4;
  const larguraValor = Math.max(24, largura - rotuloLargura);
  doc.font('Helvetica').fontSize(8.5);
  const alturaValor = texto ? doc.heightOfString(texto, { width: larguraValor }) : 10;

  doc.font('Helvetica-Bold').fillColor('#111111').text(rotulo, x, y, { lineBreak: false });
  if (texto) {
    doc.font('Helvetica').text(texto, x + rotuloLargura, y, { width: larguraValor });
  }

  const base = y + Math.max(alturaValor, 10) + 1;
  doc
    .strokeColor('#222222')
    .lineWidth(0.5)
    .moveTo(x + rotuloLargura, base)
    .lineTo(x + largura, base)
    .stroke();
  return base + 7;
}

function desenharPar(
  doc: Doc,
  x: number,
  y: number,
  largura: number,
  esquerda: { rotulo: string; valor: string | null },
  direita: { rotulo: string; valor: string | null },
): number {
  const coluna = (largura - 16) / 2;
  const yEsquerda = desenharCampo(doc, x, y, coluna, esquerda.rotulo, esquerda.valor);
  const yDireita = desenharCampo(doc, x + coluna + 16, y, coluna, direita.rotulo, direita.valor);
  return Math.max(yEsquerda, yDireita);
}

@Injectable()
export class PropostaFiliacaoPdfService {
  async gerar(dados: DadosPropostaFiliacao): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 36, bottom: 36, left: 42, right: 42 },
      info: {
        Title: 'Proposta de Filiação',
        Author: 'SINDPRF-CE',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const pronto = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const x = doc.page.margins.left;
    const largura = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let y = doc.page.margins.top;

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#111111');
    doc.text('PROPOSTA DE FILIAÇÃO', x, y, { width: largura, align: 'center' });
    y = doc.y + 14;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('DADOS PESSOAIS E FUNCIONAIS', x, y, { lineBreak: false });
    y += 16;

    y = desenharCampo(doc, x, y, largura, 'Nome:', dados.nome);
    y = desenharCampo(doc, x, y, largura, 'Matrícula:', dados.matricula);
    y = desenharCampo(doc, x, y, largura, 'Endereço:', dados.endereco);
    y = desenharCampo(doc, x, y, largura, 'Complem.:', dados.complemento);
    y = desenharPar(
      doc,
      x,
      y,
      largura,
      { rotulo: 'Bairro:', valor: dados.bairro },
      { rotulo: 'Cidade:', valor: dados.cidade },
    );
    y = desenharPar(
      doc,
      x,
      y,
      largura,
      { rotulo: 'UF:', valor: dados.uf },
      { rotulo: 'CEP.:', valor: formatarCep(dados.cep) },
    );
    y = desenharPar(
      doc,
      x,
      y,
      largura,
      { rotulo: 'Naturalidade:', valor: dados.naturalidade },
      {
        rotulo: 'Estado Civil:',
        valor: dados.estadoCivil ? ESTADO_CIVIL_ROTULO[dados.estadoCivil] : null,
      },
    );
    y = desenharCampo(doc, x, y, largura, 'Data de nasc.:', formatarData(dados.dataNascimento));

    const colunaTerco = (largura - 24) / 3;
    const yCpf = desenharCampo(doc, x, y, colunaTerco, 'C.P.F.:', formatarCpf(dados.cpf));
    const yRg = desenharCampo(doc, x + colunaTerco + 12, y, colunaTerco, 'RG.:', dados.rg);
    const yOrgao = desenharCampo(
      doc,
      x + (colunaTerco + 12) * 2,
      y,
      colunaTerco,
      'Órgão Expedidor:',
      dados.orgaoExpedidor,
    );
    y = Math.max(yCpf, yRg, yOrgao);

    y = desenharPar(
      doc,
      x,
      y,
      largura,
      { rotulo: 'Lotação:', valor: lotacao(dados) },
      { rotulo: 'Escolaridade:', valor: null },
    );
    y = desenharCampo(doc, x, y, largura, 'Data de Admissão:', formatarData(dados.dataAdmissao));
    if (dados.instituidorPensao?.trim()) {
      y = desenharCampo(doc, x, y, largura, 'Instituidor da pensão:', dados.instituidorPensao);
    }
    y = desenharCampo(doc, x, y, largura, 'Mãe:', dados.nomeMae);
    y = desenharCampo(doc, x, y, largura, 'Pai:', dados.nomePai);
    y = desenharCampo(doc, x, y, largura, 'Telefone:', formatarTelefone(dados.telefone));
    y = desenharCampo(doc, x, y, largura, 'Celular:', formatarTelefone(dados.celular));
    y = desenharCampo(doc, x, y, largura, 'Celular 2:', formatarTelefone(dados.celular2));
    y = desenharCampo(doc, x, y, largura, 'E-mail pessoal:', dados.email);
    y = desenharCampo(doc, x, y, largura, 'E-mail funcional:', dados.emailFuncional);
    y = desenharCampo(doc, x, y, largura, 'Cônjuge:', dados.conjuge);

    y += 4;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111');
    doc.text('DEPENDENTES LEGAIS', x, y, { lineBreak: false });
    y += 16;

    for (let indice = 0; indice < VAGAS_DEPENDENTES; indice += 1) {
      const dependente = dados.dependentes[indice];
      y = desenharPar(
        doc,
        x,
        y,
        largura,
        { rotulo: `${indice + 1}. Nome:`, valor: dependente?.nome ?? null },
        { rotulo: 'Grau de parentesco:', valor: dependente?.parentesco ?? null },
      );
      y = desenharPar(
        doc,
        x,
        y,
        largura,
        { rotulo: 'CPF:', valor: null },
        {
          rotulo: 'Data de Nascimento:',
          valor: formatarData(dependente?.dataNascimento ?? null),
        },
      );
    }

    y += 6;
    doc.font('Helvetica').fontSize(8).fillColor('#111111');
    doc.text(DECLARACAO, x, y, { width: largura, align: 'justify' });
    y = doc.y + 16;

    doc.font('Helvetica').fontSize(9);
    doc.text(dataPorExtenso(dados.emitidaEm), x, y, { width: largura, align: 'left' });
    y = doc.y + 28;

    const linhaAssinatura = 220;
    const xAssinatura = x + (largura - linhaAssinatura) / 2;
    doc
      .strokeColor('#222222')
      .lineWidth(0.6)
      .moveTo(xAssinatura, y)
      .lineTo(xAssinatura + linhaAssinatura, y)
      .stroke();
    doc.font('Helvetica').fontSize(8).text('Assinatura', xAssinatura, y + 4, {
      width: linhaAssinatura,
      align: 'center',
    });

    doc.end();
    const buffer = await pronto;
    return { buffer, nomeArquivo: nomeArquivoSeguro(dados.nome) };
  }
}
