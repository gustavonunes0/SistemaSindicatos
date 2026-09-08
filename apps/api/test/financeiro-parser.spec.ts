import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseDocumentoFinanceiro,
  parseSicoobExtrato,
  parseSicoobFatura,
  parseSicrediExtrato,
  parseSicrediFatura,
} from '../src/financeiro/financeiro-parser';

function fixture(nome: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'financeiro', nome), 'utf8');
}

describe('parsers financeiros', () => {
  it('interpreta extrato Sicoob e concilia o saldo', () => {
    const resultado = parseSicoobExtrato(fixture('sicoob-extrato.txt'));
    expect(resultado.layout).toBe('SICOOB_EXTRATO');
    expect(resultado.contaDetectada?.numero).toBe('12308-0');
    expect(resultado.contaDetectada?.titularDocumento).toBe('12345678000190');
    expect(resultado.lancamentos).toHaveLength(2);
    expect(resultado.validacaoSaldo.status).toBe('VALIDO');
  });

  it('interpreta fatura Sicoob', () => {
    const resultado = parseSicoobFatura(fixture('sicoob-fatura.txt'));
    expect(resultado.layout).toBe('SICOOB_FATURA');
    expect(resultado.totalDocumento).toBe(200);
    expect(resultado.validacaoSaldo.status).toBe('NAO_APLICAVEL');
    expect(resultado.avisos).toEqual([]);
  });

  it('interpreta extrato Sicredi e sanitiza documento de contraparte', () => {
    const resultado = parseSicrediExtrato(fixture('sicredi-extrato.txt'));
    expect(resultado.layout).toBe('SICREDI_EXTRATO');
    expect(resultado.lancamentos[1]?.contraparteDocumento).toBe('***.654.321-**');
    expect(resultado.lancamentos[1]?.descricao).not.toContain('98765432100');
    expect(resultado.validacaoSaldo.status).toBe('VALIDO');
  });

  it('interpreta fatura Sicredi', () => {
    const resultado = parseSicrediFatura(fixture('sicredi-fatura.txt'));
    expect(resultado.layout).toBe('SICREDI_FATURA');
    expect(resultado.lancamentos.map((item) => item.valor)).toEqual([300, 450]);
    expect(resultado.contaDetectada).toBeNull();
    expect(resultado.lancamentos[0]).toMatchObject({
      portadorNome: 'DEMONSTRACAO',
      cartaoFinal: '1617',
      parcelaNumero: 1,
      parcelaTotal: 3,
    });
    expect(resultado.totalDocumento).toBe(750);
  });

  it('aceita extrato Sicredi sem movimento', () => {
    const resultado = parseSicrediExtrato(`
      SICREDI
      Cooperativa: 2307
      Conta: 02982-3
      Extrato (Período de 01/01/2026 a 31/01/2026)
      Não há lançamentos no período selecionado.
    `);
    expect(resultado.lancamentos).toEqual([]);
    expect(resultado.competenciaAno).toBe(2026);
    expect(resultado.competenciaMes).toBe(1);
  });

  it('rejeita comprovante como documento financeiro', () => {
    expect(() =>
      parseDocumentoFinanceiro({
        conteudo: {
          texto: 'SICREDI Autenticação Eletrônica: Descrição do Pagamento: comprovante de pagamento',
        },
        arquivoNome: 'documento.pdf',
      }),
    ).toThrow('Comprovante de pagamento');
  });

  it('aceita páginas estruturadas, detecta layout e produz hash estável', () => {
    const texto = fixture('sicoob-extrato.txt');
    const linhas = texto.split(/\r?\n/);
    const primeira = parseDocumentoFinanceiro({
      conteudo: { texto },
      arquivoNome: 'extrato.pdf',
    });
    const segunda = parseDocumentoFinanceiro({
      conteudo: {
        paginas: [
          {
            numero: 1,
            itens: linhas.map((linha, indice) => ({ texto: linha, x: 10, y: 1000 - indice * 10 })),
          },
        ],
      },
      arquivoNome: 'extrato.pdf',
    });
    expect(segunda.sha256).toBe(primeira.sha256);
    expect(segunda.lancamentos.map((item) => item.fingerprint)).toEqual(
      primeira.lancamentos.map((item) => item.fingerprint),
    );
  });
});
