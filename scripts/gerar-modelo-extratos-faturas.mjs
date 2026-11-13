import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const destino = join(
  dirname(fileURLToPath(import.meta.url)),
  '../apps/web/public/modelos/modelo-extratos-faturas.xlsx',
);

const instrucoes = [
  ['MODELO PADRÃO — Extratos e faturas (SindiGest)'],
  [],
  ['Como usar'],
  ['1. Preencha a aba Documento (coluna "valor") com os dados do extrato ou da fatura.'],
  ['2. Preencha a aba Lancamentos com uma linha por movimento, a partir da linha 2.'],
  ['3. Em Financeiro > Extratos e faturas, envie o arquivo .xlsx junto ou no lugar dos PDFs.'],
  ['4. Revise o preview e confirme a importação. Não renomeie abas nem colunas.'],
  [],
  ['Regras'],
  ['- instituicao: SICOOB ou SICREDI'],
  ['- tipoDocumento: EXTRATO ou FATURA'],
  ['- tipo (lançamento): CREDITO ou DEBITO'],
  ['- Datas: AAAA-MM-DD ou DD/MM/AAAA (células de data do Excel também são aceitas)'],
  ['- Valores sempre positivos (ex.: 1500,50 ou 1500.50); o tipo define crédito ou débito'],
  ['- competenciaMes: 1 a 12'],
  ['- CPF/CNPJ: 11 ou 14 dígitos'],
  ['- EXTRATO: saldoInicial + créditos − débitos deve ser igual a saldoFinal, senão a importação é bloqueada'],
  ['- FATURA: saldoInicial e saldoFinal podem ficar vazios'],
  ['- Reenviar a mesma planilha é detectado como duplicado'],
  [],
  ['Campos obrigatórios do Documento'],
  ['instituicao, tipoDocumento, competenciaAno, competenciaMes, periodoInicio, periodoFim, agencia, numero, nomeConta'],
  [],
  ['Campos obrigatórios de cada lançamento'],
  ['data, descricao, tipo, valor'],
];

const documento = [
  ['campo', 'valor', 'obrigatorio', 'observacao'],
  ['instituicao', 'SICOOB', 'sim', 'SICOOB ou SICREDI'],
  ['tipoDocumento', 'EXTRATO', 'sim', 'EXTRATO ou FATURA'],
  ['competenciaAno', 2026, 'sim', 'Ano da competência'],
  ['competenciaMes', 10, 'sim', 'Mês de 1 a 12'],
  ['periodoInicio', '2026-10-01', 'sim', 'AAAA-MM-DD'],
  ['periodoFim', '2026-10-31', 'sim', 'AAAA-MM-DD'],
  ['vencimento', '', 'não', 'Usado em faturas'],
  ['totalDocumento', '', 'não', 'Total da fatura'],
  ['saldoInicial', 10000, 'sim em EXTRATO', 'Saldo no início do período'],
  ['saldoFinal', 11089.6, 'sim em EXTRATO', 'Saldo inicial + créditos − débitos'],
  ['agencia', '1234', 'sim', 'Agência/cooperativa'],
  ['numero', '56789-0', 'sim', 'Número da conta'],
  ['nomeConta', 'Conta corrente principal', 'sim', 'Nome amigável da conta'],
  ['titularNome', 'SINDPRF-CE', 'não', 'Titular da conta'],
  ['titularDocumento', '41410325000120', 'não', 'CPF (11) ou CNPJ (14), só números'],
];

const lancamentos = [
  [
    'data',
    'descricao',
    'documento',
    'tipo',
    'valor',
    'saldoApos',
    'contraparteNome',
    'contraparteDocumento',
    'portadorNome',
    'cartaoFinal',
    'parcelaNumero',
    'parcelaTotal',
  ],
  ['2026-10-02', 'TED recebida - contribuição sindical', 'DOC123', 'CREDITO', 1500, 11500, 'Fulano de Tal', '', '', '', '', ''],
  ['2026-10-05', 'Pagamento fornecedor', 'NF9988', 'DEBITO', 320.5, 11179.5, 'Papelaria Exemplo', '', '', '', '', ''],
  ['2026-10-12', 'Compra cartão - material de escritório', '', 'DEBITO', 89.9, 11089.6, '', '', 'Fulano de Tal', '1234', 1, 3],
];

function aba(linhas, larguras) {
  const planilha = XLSX.utils.aoa_to_sheet(linhas);
  planilha['!cols'] = larguras.map((wch) => ({ wch }));
  return planilha;
}

const livro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(livro, aba(instrucoes, [110]), 'Instrucoes');
XLSX.utils.book_append_sheet(livro, aba(documento, [20, 28, 16, 40]), 'Documento');
XLSX.utils.book_append_sheet(
  livro,
  aba(lancamentos, [12, 42, 12, 10, 12, 12, 24, 20, 20, 12, 13, 12]),
  'Lancamentos',
);
XLSX.writeFile(livro, destino);
console.log(`Modelo gerado em ${destino}`);
