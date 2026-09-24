import { Injectable } from '@nestjs/common';
import { ESTADO_CIVIL_ROTULO, type EstadoCivil } from '@sindprf/types';
import PDFDocument from 'pdfkit';

const VAGAS_DEPENDENTES = 5;
const LARGURA = 510;
const BORDA = '#bfbfbf';
const ALTURA = 18;
const ESPACO = 7;

const DECLARACAO =
  'Declaro aceitar as condições constantes do Estatuto do SINDPRF-CE, comprometendo-me a cumpri-las e fazer com que sejam cumpridas na esfera da minha responsabilidade, autorizando, inclusive, o desconto em folha de pagamento, da mensalidade social em favor do Sindicato dos Policiais Rodoviários Federais no Estado do Ceará, decidido em Assembléia.';

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
  logo: Buffer | null;
};

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Fortaleza',
});

type Doc = PDFKit.PDFDocument;
type Alinhamento = 'left' | 'center' | 'right' | 'justify';

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

function formatarData(data: Date | null | undefined): string | null {
  if (!data) return null;
  return dataCurta.format(data);
}

function campo(rotulo: string, valor: string | null | undefined): string {
  const texto = valor?.trim();
  return texto ? `${rotulo} ${texto}` : rotulo;
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

function desenharLinha(
  doc: Doc,
  x: number,
  y: number,
  proporcoes: number[],
  textos: string[],
  opcoes: {
    borda?: boolean;
    negrito?: boolean;
    alinhamento?: Alinhamento;
    tamanho?: number;
    sublinhado?: boolean;
    altura?: number;
  } = {},
): number {
  const tamanho = opcoes.tamanho ?? 11;
  const altura = opcoes.altura ?? ALTURA;
  const soma = proporcoes.reduce((total, parte) => total + parte, 0);
  let cursor = x;

  doc.font(opcoes.negrito ? 'Times-Bold' : 'Times-Roman').fontSize(tamanho).fillColor('#000000');

  for (let indice = 0; indice < proporcoes.length; indice += 1) {
    const larguraCelula = (LARGURA * proporcoes[indice]!) / soma;
    if (opcoes.borda !== false) {
      doc.save();
      doc.lineWidth(0.75).strokeColor(BORDA).rect(cursor, y, larguraCelula, altura).stroke();
      doc.restore();
    }
    const texto = textos[indice] ?? '';
    doc.font(opcoes.negrito ? 'Times-Bold' : 'Times-Roman').fontSize(tamanho).fillColor('#000000');
    doc.text(texto, cursor + 5, y + 3, {
      width: Math.max(8, larguraCelula - 10),
      height: altura - 4,
      align: opcoes.alinhamento ?? 'left',
      underline: opcoes.sublinhado,
      lineBreak: true,
      ellipsis: true,
    });
    cursor += larguraCelula;
  }

  return y + altura;
}

function desenharLotacao(
  doc: Doc,
  x: number,
  y: number,
  lotacaoTexto: string | null,
  admissao: string | null,
): number {
  const larguraLotacao = (LARGURA * 340.2) / (340.2 + 170.4);
  const larguraAdmissao = LARGURA - larguraLotacao;

  doc.save();
  doc.lineWidth(0.75).strokeColor(BORDA);
  doc.rect(x, y, larguraLotacao, ALTURA).stroke();
  doc.rect(x + larguraLotacao, y, larguraAdmissao, ALTURA).stroke();
  doc.restore();

  doc.font('Times-Roman').fontSize(11).fillColor('#000000');
  doc.text(campo('Lotação:', lotacaoTexto), x + 5, y + 3, {
    width: larguraLotacao * 0.62,
    height: ALTURA - 4,
    ellipsis: true,
  });
  doc.text('Escolaridade:', x + larguraLotacao * 0.64, y + 3, {
    width: larguraLotacao * 0.34,
    height: ALTURA - 4,
    lineBreak: false,
  });
  doc.text(campo('Data de Admissão:', admissao), x + larguraLotacao + 5, y + 3, {
    width: larguraAdmissao - 10,
    height: ALTURA - 4,
    ellipsis: true,
  });

  return y + ALTURA;
}

@Injectable()
export class PropostaFiliacaoPdfService {
  async gerar(dados: DadosPropostaFiliacao): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 28, bottom: 28, left: 42, right: 42 },
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

    const x = (doc.page.width - LARGURA) / 2;
    let y = 28;

    if (dados.logo) {
      const caixa = 52;
      try {
        doc.image(dados.logo, x + (LARGURA - caixa) / 2, y, {
          fit: [caixa, caixa],
          align: 'center',
          valign: 'center',
        });
        y += caixa + 8;
      } catch {
        // A ficha segue sem a marca se o arquivo não puder ser lido.
      }
    }

    y = desenharLinha(doc, x, y, [1], ['PROPOSTA DE FILIAÇÃO'], {
      borda: false,
      negrito: true,
      alinhamento: 'center',
      tamanho: 12,
      sublinhado: true,
      altura: 16,
    });
    y += ESPACO;
    y += ESPACO;

    y = desenharLinha(doc, x, y, [1], ['DADOS PESSOAIS E FUNCIONAIS'], {
      borda: false,
      negrito: true,
      altura: 16,
    });
    y = desenharLinha(
      doc,
      x,
      y,
      [343.6, 166.9],
      [campo('Nome:', dados.nome), campo('Matrícula:', dados.matricula)],
    );
    y += ESPACO;
    y = desenharLinha(
      doc,
      x,
      y,
      [343.6, 166.9],
      [campo('Endereço:', dados.endereco), campo('Complem.:', dados.complemento)],
    );
    y += ESPACO;
    y = desenharLinha(
      doc,
      x,
      y,
      [173.4, 170.2, 49.6, 117.3],
      [
        campo('Bairro:', dados.bairro),
        campo('Cidade:', dados.cidade),
        campo('UF:', dados.uf),
        campo('CEP.:', formatarCep(dados.cep)),
      ],
    );
    y += ESPACO;
    y = desenharLinha(
      doc,
      x,
      y,
      [170, 173.6, 166.9],
      [
        campo('Naturalidade:', dados.naturalidade),
        campo(
          'Estado Civil:',
          dados.estadoCivil ? ESTADO_CIVIL_ROTULO[dados.estadoCivil] : null,
        ),
        campo('Data de nasc.:', formatarData(dados.dataNascimento)),
      ],
    );
    y += ESPACO;
    y = desenharLinha(
      doc,
      x,
      y,
      [173.4, 168.4, 168.7],
      [
        campo('C.P.F.:', formatarCpf(dados.cpf)),
        campo('RG.:', dados.rg),
        campo('Órgão Expedidor:', dados.orgaoExpedidor),
      ],
    );
    y += ESPACO;
    y = desenharLotacao(doc, x, y, lotacao(dados), formatarData(dados.dataAdmissao));
    y += ESPACO;
    y = desenharLinha(doc, x, y, [1], [campo('Mãe:', dados.nomeMae)]);
    y = desenharLinha(doc, x, y, [1], [campo('Pai:', dados.nomePai)]);
    y += ESPACO;
    y = desenharLinha(
      doc,
      x,
      y,
      [170, 170.2, 170.4],
      [
        campo('Telefone:', formatarTelefone(dados.telefone)),
        campo('Celular:', formatarTelefone(dados.celular)),
        campo('Celular 2:', formatarTelefone(dados.celular2)),
      ],
    );
    y += ESPACO;
    y = desenharLinha(doc, x, y, [1], [campo('E-mail pessoal:', dados.email)]);
    y += ESPACO;
    y = desenharLinha(doc, x, y, [1], [campo('E-mail funcional:', dados.emailFuncional)]);
    y += ESPACO;
    y = desenharLinha(doc, x, y, [1], [campo('Cônjuge:', dados.conjuge)]);
    y += ESPACO;

    y = desenharLinha(doc, x, y, [1], ['DEPENDENTES LEGAIS'], {
      borda: false,
      negrito: true,
      altura: 16,
    });

    for (let indice = 0; indice < VAGAS_DEPENDENTES; indice += 1) {
      const dependente = dados.dependentes[indice];
      y = desenharLinha(doc, x, y, [1], [campo(`${indice + 1}. Nome:`, dependente?.nome)]);
      y = desenharLinha(
        doc,
        x,
        y,
        [201.9, 134.5, 174.1],
        [
          campo('Grau de parentesco:', dependente?.parentesco),
          'CPF:',
          campo('Data de Nascimento:', formatarData(dependente?.dataNascimento)),
        ],
      );
      y += ESPACO;
    }

    doc.font('Times-Roman').fontSize(11).fillColor('#000000');
    doc.text(DECLARACAO, x, y, { width: LARGURA, align: 'justify' });
    y = doc.y + 12;

    doc.font('Times-Roman').fontSize(12);
    doc.text('Fortaleza (CE), ________ de ____________________ de _________', x, y, {
      width: LARGURA,
      align: 'right',
    });
    y = doc.y + 22;

    const linhaAssinatura = '___________________________________________________';
    doc.font('Times-Roman').fontSize(12);
    const larguraLinha = doc.widthOfString(linhaAssinatura);
    const xLinha = x + LARGURA - larguraLinha;
    doc.text(linhaAssinatura, xLinha, y, { lineBreak: false });
    doc.text('Assinatura', xLinha, y + 14, { width: larguraLinha, align: 'center' });

    doc.end();
    const buffer = await pronto;
    return { buffer, nomeArquivo: nomeArquivoSeguro(dados.nome) };
  }
}
