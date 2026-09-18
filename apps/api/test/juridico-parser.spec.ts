import * as XLSX from 'xlsx';
import { parsePlanilhaAcoes } from '../src/juridico/juridico-parser';

function criarPlanilha(linhas: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(linhas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Ações');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('parsePlanilhaAcoes', () => {
  it('lê colunas Nome, CPF, Nº da ação e status', () => {
    const buffer = criarPlanilha([
      ['Nome', 'CPF', 'Nº da ação', 'status'],
      ['Maria Silva', '529.982.247-25', '0001234-56.2024.4.01.3400', 'Em andamento'],
    ]);

    const resultado = parsePlanilhaAcoes(buffer);

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0]).toMatchObject({
      nome: 'Maria Silva',
      cpf: '52998224725',
      numeroAcao: '0001234-56.2024.4.01.3400',
      status: 'Em andamento',
      sequencia: 1,
    });
  });

  it('rejeita planilha sem cabeçalho esperado', () => {
    const buffer = criarPlanilha([
      ['Nome', 'CPF', 'Processo'],
      ['João', '529.982.247-25', '123'],
    ]);

    expect(() => parsePlanilhaAcoes(buffer)).toThrow(/colunas/i);
  });
});
