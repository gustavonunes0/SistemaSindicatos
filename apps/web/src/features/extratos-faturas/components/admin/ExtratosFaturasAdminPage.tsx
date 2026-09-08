import type {
  ConteudoDocumentoFinanceiro,
  ContaFinanceira,
  ListaImportacoesFinanceiras,
  PreviewImportacaoFinanceira,
  TipoDocumentoFinanceiro,
} from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { FinanceiroSubnav } from '../../../financeiro/components/admin/FinanceiroSubnav';
import { extrairConteudoPdf } from '../../extrairPdf';
import {
  useContasFinanceiras,
  useImportacaoFinanceiraDetalhe,
  useImportacoesFinanceiras,
  useImportarDocumentoFinanceiro,
  usePreviewFinanceiro,
} from '../../hooks';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const lotePdfSchema = z
  .array(z.instanceof(File))
  .min(1, 'Selecione ao menos um arquivo.')
  .max(100, 'Envie no máximo 100 PDFs por lote.')
  .refine(
    (arquivos) =>
      arquivos.every(
        (arquivo) =>
          arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf'),
      ),
    'O lote aceita somente arquivos PDF.',
  );

type ImportacaoComConta = ListaImportacoesFinanceiras['itens'][number];
type StatusFila = 'PROCESSANDO' | 'PRONTO' | 'DUPLICADO' | 'ERRO' | 'CONFIRMANDO';

interface DocumentoFila {
  id: string;
  arquivo: File;
  conteudo?: ConteudoDocumentoFinanceiro;
  preview?: PreviewImportacaoFinanceira;
  contaId: string;
  status: StatusFila;
  erro?: string;
}

function formatarMoeda(valor: number | null): string {
  if (valor === null) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(valor: Date): string {
  return valor.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function mensagemErro(erro: unknown): string {
  if (isAxiosError(erro)) {
    const dados = erro.response?.data as { message?: string | string[] } | undefined;
    if (typeof dados?.message === 'string') return dados.message;
    if (Array.isArray(dados?.message)) return dados.message.join(', ');
  }
  return erro instanceof Error ? erro.message : 'Não foi possível processar o documento.';
}

function normalizarConta(valor: string): string {
  return valor.replace(/\D/g, '').replace(/^0+/, '');
}

function contaCadastradaCorrespondente(
  preview: PreviewImportacaoFinanceira,
  contas: ContaFinanceira[],
): ContaFinanceira | undefined {
  if (!preview.contaDetectada) return undefined;
  return contas.find(
    (conta) =>
      conta.instituicao === preview.instituicao &&
      normalizarConta(conta.agencia) === normalizarConta(preview.contaDetectada?.agencia ?? '') &&
      normalizarConta(conta.numero) === normalizarConta(preview.contaDetectada?.numero ?? ''),
  );
}

async function executarComConcorrencia<T>(
  itens: T[],
  limite: number,
  tarefa: (item: T) => Promise<void>,
): Promise<void> {
  let indice = 0;
  async function worker() {
    while (indice < itens.length) {
      const atual = itens[indice];
      indice += 1;
      if (atual !== undefined) await tarefa(atual);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, worker));
}

export function ExtratosFaturasAdminPage() {
  const contasQuery = useContasFinanceiras();
  const historicoQuery = useImportacoesFinanceiras({ pagina: 1, limite: 100 });
  const previewMutation = usePreviewFinanceiro();
  const importarMutation = useImportarDocumentoFinanceiro();
  const [fila, setFila] = useState<DocumentoFila[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<string>();
  const [arrastando, setArrastando] = useState(false);
  const [erroUpload, setErroUpload] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [busca, setBusca] = useState('');
  const [filtroBanco, setFiltroBanco] = useState('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | TipoDocumentoFinanceiro>('TODOS');
  const [detalheId, setDetalheId] = useState<string>();
  const [paginaDetalhe, setPaginaDetalhe] = useState(1);
  const [buscaLancamentos, setBuscaLancamentos] = useState('');
  const [tipoLancamento, setTipoLancamento] = useState<'TODOS' | 'CREDITO' | 'DEBITO'>(
    'TODOS',
  );
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const detalheQuery = useImportacaoFinanceiraDetalhe(detalheId, {
    pagina: paginaDetalhe,
    limite: 50,
    ...(buscaLancamentos.trim() ? { busca: buscaLancamentos.trim() } : {}),
    ...(tipoLancamento !== 'TODOS' ? { tipo: tipoLancamento } : {}),
    ...(dataInicio ? { dataInicio: new Date(`${dataInicio}T00:00:00.000Z`) } : {}),
    ...(dataFim ? { dataFim: new Date(`${dataFim}T23:59:59.999Z`) } : {}),
  });

  const contas = contasQuery.data ?? [];
  const historico = historicoQuery.data?.itens ?? [];
  const selecionado = fila.find((item) => item.id === selecionadoId);
  const processando = fila.some(
    (item) => item.status === 'PROCESSANDO' || item.status === 'CONFIRMANDO',
  );

  function atualizarFila(id: string, alteracao: Partial<DocumentoFila>) {
    setFila((atual) =>
      atual.map((documento) => (documento.id === id ? { ...documento, ...alteracao } : documento)),
    );
  }

  function atribuirConta(documento: DocumentoFila, contaId: string) {
    const finalCartao = documento.preview?.lancamentos.find((item) => item.cartaoFinal)?.cartaoFinal;
    setFila((atual) =>
      atual.map((item) => {
        if (item.id === documento.id) return { ...item, contaId };
        const preview = item.preview;
        const mesmoCartao =
          contaId &&
          finalCartao &&
          preview?.instituicao === documento.preview?.instituicao &&
          preview?.tipoDocumento === 'FATURA' &&
          preview.lancamentos.some((lancamento) => lancamento.cartaoFinal === finalCartao);
        return mesmoCartao ? { ...item, contaId } : item;
      }),
    );
  }

  function importacaoDaCompetencia(documento: DocumentoFila): ImportacaoComConta | undefined {
    if (!documento.preview || !documento.contaId) return undefined;
    return historico.find(
      (item) =>
        item.contaId === documento.contaId &&
        item.tipoDocumento === documento.preview?.tipoDocumento &&
        item.competenciaAno === documento.preview.competenciaAno &&
        item.competenciaMes === documento.preview.competenciaMes,
    );
  }

  function podeConfirmar(documento: DocumentoFila): boolean {
    if (documento.status !== 'PRONTO' || !documento.preview || !documento.conteudo) return false;
    if (documento.preview.validacaoSaldo.status === 'DIVERGENTE') return false;
    return Boolean(documento.contaId || documento.preview.contaDetectada);
  }

  async function adicionarArquivos(arquivos: File[]) {
    const validacao = lotePdfSchema.safeParse(arquivos);
    if (!validacao.success) {
      setErroUpload(validacao.error.issues[0]?.message ?? 'Lote inválido.');
      return;
    }
    setErroUpload(undefined);
    setFeedback(undefined);
    const entradas = validacao.data.map((arquivo) => ({
      id: crypto.randomUUID(),
      arquivo,
    }));
    setFila((atual) => [
      ...atual,
      ...entradas.map<DocumentoFila>(({ id, arquivo }) => ({
        id,
        arquivo,
        contaId: '',
        status: 'PROCESSANDO',
      })),
    ]);
    setSelecionadoId((atual) => atual ?? entradas[0]?.id);
    const hashesDoLote = new Set<string>();

    await executarComConcorrencia(entradas, 4, async ({ id, arquivo }) => {
      try {
        const conteudo = await extrairConteudoPdf(arquivo);
        const preview = await previewMutation.mutateAsync({
          arquivoNome: arquivo.name,
          ...conteudo,
        });
        const contaCorrespondente = contaCadastradaCorrespondente(preview, contas);
        const duplicado =
          historico.some((item) => item.sha256 === preview.sha256) ||
          hashesDoLote.has(preview.sha256);
        hashesDoLote.add(preview.sha256);
        atualizarFila(id, {
          conteudo,
          preview,
          contaId: contaCorrespondente?.id ?? '',
          status: duplicado ? 'DUPLICADO' : 'PRONTO',
        });
      } catch (erro) {
        atualizarFila(id, { status: 'ERRO', erro: mensagemErro(erro) });
      }
    });
  }

  async function confirmarDocumentos(documentos: DocumentoFila[]) {
    let confirmados = 0;
    for (const documento of documentos) {
      if (!podeConfirmar(documento) || !documento.preview || !documento.conteudo) continue;
      atualizarFila(documento.id, { status: 'CONFIRMANDO', erro: undefined });
      try {
        const existente = importacaoDaCompetencia(documento);
        await importarMutation.mutateAsync({
          arquivoNome: documento.arquivo.name,
          ...documento.conteudo,
          instituicao: documento.preview.instituicao,
          tipoDocumento: documento.preview.tipoDocumento,
          sha256Esperado: documento.preview.sha256,
          ...(documento.contaId
            ? { contaId: documento.contaId }
            : documento.preview.contaDetectada
              ? { conta: documento.preview.contaDetectada }
              : {}),
          substituirExistente: Boolean(existente),
        });
        confirmados += 1;
        setFila((atual) => atual.filter((item) => item.id !== documento.id));
      } catch (erro) {
        atualizarFila(documento.id, { status: 'PRONTO', erro: mensagemErro(erro) });
      }
    }
    setSelecionadoId(undefined);
    if (confirmados > 0) {
      setFeedback(
        `${confirmados} ${confirmados === 1 ? 'documento importado' : 'documentos importados'} com sucesso.`,
      );
    }
  }

  const confirmaveis = fila.filter(podeConfirmar);
  const historicoFiltrado = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return historico.filter(
      (item) =>
        (filtroBanco === 'TODOS' || item.instituicao === filtroBanco) &&
        (filtroTipo === 'TODOS' || item.tipoDocumento === filtroTipo) &&
        (!termo ||
          item.arquivoNome.toLocaleLowerCase('pt-BR').includes(termo) ||
          item.conta.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
          item.conta.numero.toLocaleLowerCase('pt-BR').includes(termo)),
    );
  }, [busca, filtroBanco, filtroTipo, historico]);

  const gruposHistorico = useMemo(() => {
    const grupos = new Map<
      string,
      Map<string, Map<number, Map<number, ImportacaoComConta[]>>>
    >();
    for (const item of historicoFiltrado) {
      const porConta = grupos.get(item.instituicao) ?? new Map();
      grupos.set(item.instituicao, porConta);
      const porAno = porConta.get(item.contaId) ?? new Map();
      porConta.set(item.contaId, porAno);
      const porMes = porAno.get(item.competenciaAno) ?? new Map();
      porAno.set(item.competenciaAno, porMes);
      porMes.set(item.competenciaMes, [...(porMes.get(item.competenciaMes) ?? []), item]);
    }
    return grupos;
  }, [historicoFiltrado]);

  const lacunasExtratos = useMemo(() => {
    const extratos = historico.filter((item) => item.tipoDocumento === 'EXTRATO');
    const anoMaisRecente = Math.max(0, ...extratos.map((item) => item.competenciaAno));
    const mesMaisRecente = Math.max(
      0,
      ...extratos
        .filter((item) => item.competenciaAno === anoMaisRecente)
        .map((item) => item.competenciaMes),
    );
    if (!anoMaisRecente || !mesMaisRecente) return [];

    return contas.flatMap((conta) => {
      const meses = new Set(
        extratos
          .filter(
            (item) => item.contaId === conta.id && item.competenciaAno === anoMaisRecente,
          )
          .map((item) => item.competenciaMes),
      );
      if (meses.size === 0) return [];
      const ausentes = Array.from({ length: mesMaisRecente }, (_, indice) => indice + 1).filter(
        (mes) => !meses.has(mes),
      );
      return ausentes.length > 0
        ? [
            {
              conta,
              ano: anoMaisRecente,
              meses: ausentes.map((mes) => MESES[mes - 1]).join(', '),
            },
          ]
        : [];
    });
  }, [contas, historico]);

  return (
    <AreaLayout
      tipo="admin"
      titulo="Extratos e faturas"
      descricao="Importe documentos bancários, revise os lançamentos e consulte o histórico."
    >
      <FinanceiroSubnav />

      <section
        className={`ef-upload ${arrastando ? 'ef-upload--ativo' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setArrastando(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setArrastando(false);
          void adicionarArquivos(Array.from(event.dataTransfer.files));
        }}
      >
        <div>
          <p className="eyebrow">Entrada de documentos</p>
          <h2>Adicione extratos e faturas em PDF</h2>
          <p>Até 100 arquivos por lote. Cada PDF é analisado e validado antes da importação.</p>
        </div>
        <div className="ef-upload-acoes">
          <input
            id="ef-arquivos"
            className="bal-upload-input"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            disabled={contasQuery.isLoading || historicoQuery.isLoading}
            onChange={(event) => {
              void adicionarArquivos(Array.from(event.target.files ?? []));
              event.currentTarget.value = '';
            }}
          />
          <label className="botao-primario" htmlFor="ef-arquivos">Selecionar PDFs</label>
          <span>{processando ? 'Processando lote…' : 'Também é possível arrastar aqui'}</span>
        </div>
      </section>

      {erroUpload && <p className="erro ef-feedback">{erroUpload}</p>}
      {feedback && <p className="bal-feedback bal-feedback--ok">{feedback}</p>}

      {fila.length > 0 && (
        <section className="ef-revisao">
          <div className="ef-secao-topo">
            <div>
              <p className="eyebrow">Revisão</p>
              <h2>{fila.length} {fila.length === 1 ? 'arquivo no lote' : 'arquivos no lote'}</h2>
            </div>
            <button
              type="button"
              className="botao-primario"
              disabled={confirmaveis.length === 0 || processando}
              onClick={() => void confirmarDocumentos(confirmaveis)}
            >
              Confirmar lote ({confirmaveis.length})
            </button>
          </div>

          <div className="ef-revisao-grid">
            <div className="ef-fila" role="list" aria-label="Arquivos para revisar">
              {fila.map((documento) => (
                <button
                  key={documento.id}
                  type="button"
                  role="listitem"
                  className={`ef-arquivo ${selecionadoId === documento.id ? 'ef-arquivo--ativo' : ''}`}
                  onClick={() => setSelecionadoId(documento.id)}
                >
                  <span className="ef-arquivo-topo">
                    <strong title={documento.arquivo.name}>{documento.arquivo.name}</strong>
                    <span className={`ef-status ef-status--${documento.status.toLowerCase()}`}>
                      {documento.status === 'PROCESSANDO'
                        ? 'Analisando'
                        : documento.status === 'CONFIRMANDO'
                          ? 'Importando'
                          : documento.status === 'DUPLICADO'
                            ? 'Duplicado'
                            : documento.status === 'ERRO'
                              ? 'Erro'
                              : 'Revisar'}
                    </span>
                  </span>
                  <span>
                    {formatarTamanho(documento.arquivo.size)}
                    {documento.preview ? ` · ${documento.preview.lancamentos.length} lançamentos` : ''}
                  </span>
                </button>
              ))}
            </div>

            <div className="ef-preview">
              {!selecionado && <p className="estado-vazio">Selecione um arquivo para revisar.</p>}
              {selecionado && (
                <>
                  <div className="ef-preview-topo">
                    <div>
                      <h3>{selecionado.arquivo.name}</h3>
                      <p>{formatarTamanho(selecionado.arquivo.size)}</p>
                    </div>
                    <button
                      type="button"
                      className="botao-tabela botao-tabela--perigo"
                      onClick={() => {
                        setFila((atual) => atual.filter((item) => item.id !== selecionado.id));
                        setSelecionadoId(undefined);
                      }}
                    >
                      Remover
                    </button>
                  </div>

                  {selecionado.erro && <p className="erro">{selecionado.erro}</p>}
                  {selecionado.status === 'DUPLICADO' && (
                    <p className="erro">Este documento já está importado ou repetido no lote.</p>
                  )}
                  {selecionado.preview && (
                    <>
                      {selecionado.preview.avisos.map((aviso) => (
                        <p key={aviso} className="ef-aviso">{aviso}</p>
                      ))}
                      {selecionado.preview.validacaoSaldo.status === 'DIVERGENTE' && (
                        <p className="erro">
                          Importação bloqueada: os saldos inicial e final não conciliam.
                        </p>
                      )}
                      {importacaoDaCompetencia(selecionado) && (
                        <p className="ef-aviso">
                          Já existe um documento desta conta, tipo e competência. A confirmação
                          substituirá a importação existente.
                        </p>
                      )}

                      <div className="ef-campos">
                        <label>
                          <span>Conta bancária</span>
                          <select
                            value={selecionado.contaId}
                            onChange={(event) => atribuirConta(selecionado, event.target.value)}
                          >
                            <option value="">
                              {selecionado.preview.contaDetectada
                                ? 'Usar conta detectada'
                                : 'Selecione a conta'}
                            </option>
                            {contas
                              .filter(
                                (conta) => conta.instituicao === selecionado.preview?.instituicao,
                              )
                              .map((conta) => (
                                <option key={conta.id} value={conta.id}>
                                  {conta.agencia} · {conta.numero} · {conta.nome}
                                </option>
                              ))}
                          </select>
                        </label>
                        <div className="ef-preview-dado">
                          <span>Instituição</span>
                          <strong>{selecionado.preview.instituicao}</strong>
                        </div>
                        <div className="ef-preview-dado">
                          <span>Tipo</span>
                          <strong>{selecionado.preview.tipoDocumento}</strong>
                        </div>
                        <div className="ef-preview-dado">
                          <span>Competência</span>
                          <strong>
                            {String(selecionado.preview.competenciaMes).padStart(2, '0')}/
                            {selecionado.preview.competenciaAno}
                          </strong>
                        </div>
                      </div>

                      <div className="ef-totais">
                        <article><span>Créditos</span><strong>{formatarMoeda(selecionado.preview.validacaoSaldo.totalCreditos)}</strong></article>
                        <article><span>Débitos</span><strong>{formatarMoeda(selecionado.preview.validacaoSaldo.totalDebitos)}</strong></article>
                        <article><span>Saldo final</span><strong>{formatarMoeda(selecionado.preview.validacaoSaldo.saldoFinal)}</strong></article>
                        <article><span>Total da fatura</span><strong>{formatarMoeda(selecionado.preview.totalDocumento)}</strong></article>
                      </div>

                      <div className="ef-amostra">
                        <h4>Amostra dos lançamentos</h4>
                        <div className="tabela-wrapper">
                          <table className="tabela">
                            <thead>
                              <tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr>
                            </thead>
                            <tbody>
                              {selecionado.preview.lancamentos.slice(0, 10).map((item) => (
                                <tr key={item.fingerprint}>
                                  <td>{formatarData(item.data)}</td>
                                  <td>{item.descricao}</td>
                                  <td>{item.tipo === 'CREDITO' ? 'Crédito' : 'Débito'}</td>
                                  <td>{formatarMoeda(item.valor)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="ef-preview-acoes">
                        <button
                          type="button"
                          className="botao-primario"
                          disabled={!podeConfirmar(selecionado) || processando}
                          onClick={() => void confirmarDocumentos([selecionado])}
                        >
                          {selecionado.status === 'CONFIRMANDO' ? 'Importando…' : 'Confirmar arquivo'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="ef-historico">
        <div className="ef-secao-topo">
          <div>
            <p className="eyebrow">Arquivo bancário</p>
            <h2>Histórico</h2>
            <p>{historicoQuery.data?.total ?? 0} documentos confirmados</p>
          </div>
          <div className="ef-filtros">
            <label>
              <span>Buscar</span>
              <input
                type="search"
                placeholder="Arquivo, conta ou número"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </label>
            <label>
              <span>Banco</span>
              <select value={filtroBanco} onChange={(event) => setFiltroBanco(event.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="SICOOB">Sicoob</option>
                <option value="SICREDI">Sicredi</option>
              </select>
            </label>
            <label>
              <span>Tipo</span>
              <select
                value={filtroTipo}
                onChange={(event) =>
                  setFiltroTipo(event.target.value as 'TODOS' | TipoDocumentoFinanceiro)
                }
              >
                <option value="TODOS">Todos</option>
                <option value="EXTRATO">Extratos</option>
                <option value="FATURA">Faturas</option>
              </select>
            </label>
          </div>
        </div>

        {(contasQuery.isLoading || historicoQuery.isLoading) && (
          <EstadoCarregando mensagem="Carregando histórico financeiro…" />
        )}
        {(contasQuery.isError || historicoQuery.isError) && (
          <p className="erro">Não foi possível carregar contas e importações financeiras.</p>
        )}
        {!historicoQuery.isLoading && historicoFiltrado.length === 0 && (
          <div className="estado-vazio ef-vazio">
            <strong>Nenhum documento encontrado</strong>
            <p>Adicione PDFs ou ajuste os filtros para consultar o histórico.</p>
          </div>
        )}
        {lacunasExtratos.length > 0 && !historicoQuery.isLoading && (
          <aside className="ef-lacunas" aria-label="Extratos mensais ausentes">
            <strong>Competências sem extrato</strong>
            <p>
              O sistema não preenche meses ausentes. Importe os documentos abaixo quando estiverem
              disponíveis.
            </p>
            <ul>
              {lacunasExtratos.map((lacuna) => (
                <li key={lacuna.conta.id}>
                  {lacuna.conta.instituicao} · {lacuna.conta.nome} ({lacuna.conta.numero}):{' '}
                  {lacuna.meses} de {lacuna.ano}
                </li>
              ))}
            </ul>
          </aside>
        )}
        {historicoFiltrado.length > 0 && (
          <div className="ef-arvore">
            {Array.from(gruposHistorico.entries()).map(([banco, porConta]) => (
              <details key={banco} open>
                <summary>
                  {banco}
                  <span>
                    {historicoFiltrado.filter((item) => item.instituicao === banco).length} documentos
                  </span>
                </summary>
                {Array.from(porConta.entries()).map(([contaId, porAno]) => {
                  const conta = historico.find((item) => item.contaId === contaId)?.conta;
                  return (
                    <details key={contaId} className="ef-arvore-conta">
                      <summary>{conta?.numero} · {conta?.nome}</summary>
                      {Array.from(porAno.entries()).sort(([a], [b]) => b - a).map(([ano, porMes]) => (
                        <details key={ano} className="ef-arvore-ano">
                          <summary>{ano}</summary>
                          {Array.from(porMes.entries()).sort(([a], [b]) => b - a).map(([mes, documentos]) => (
                            <div key={mes} className="ef-arvore-mes">
                              <h3>{MESES[mes - 1]}</h3>
                              {documentos.map((documento) => (
                                <button
                                  key={documento.id}
                                  type="button"
                                  onClick={() => {
                                    setDetalheId(documento.id);
                                    setPaginaDetalhe(1);
                                    setBuscaLancamentos('');
                                    setTipoLancamento('TODOS');
                                    setDataInicio('');
                                    setDataFim('');
                                  }}
                                >
                                  <span><strong>{documento.tipoDocumento}</strong>{documento.arquivoNome}</span>
                                  <span>{documento.totalLancamentos} lançamentos</span>
                                </button>
                              ))}
                            </div>
                          ))}
                        </details>
                      ))}
                    </details>
                  );
                })}
              </details>
            ))}
          </div>
        )}
      </section>

      {detalheId && (
        <div className="ef-modal-fundo" role="presentation" onMouseDown={() => setDetalheId(undefined)}>
          <section
            className="ef-detalhe"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ef-detalhe-titulo"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">
                  {detalheQuery.data?.conta.instituicao} · {detalheQuery.data?.conta.numero}
                </p>
                <h2 id="ef-detalhe-titulo">
                  {detalheQuery.data?.arquivoNome ?? 'Carregando documento…'}
                </h2>
                {detalheQuery.data && (
                  <p>
                    {detalheQuery.data.tipoDocumento} ·{' '}
                    {MESES[detalheQuery.data.competenciaMes - 1]} de{' '}
                    {detalheQuery.data.competenciaAno}
                  </p>
                )}
              </div>
              <button type="button" className="botao-secundario" onClick={() => setDetalheId(undefined)}>
                Fechar
              </button>
            </header>
            {detalheQuery.isLoading && <EstadoCarregando mensagem="Carregando lançamentos…" />}
            {detalheQuery.isError && <p className="erro">Não foi possível carregar este documento.</p>}
            {detalheQuery.data && (
              <>
                <div className="ef-detalhe-filtros">
                  <label>
                    <span>Buscar nos lançamentos</span>
                    <input
                      type="search"
                      placeholder="Descrição, portador ou cartão"
                      value={buscaLancamentos}
                      onChange={(event) => {
                        setBuscaLancamentos(event.target.value);
                        setPaginaDetalhe(1);
                      }}
                    />
                  </label>
                  <label>
                    <span>Natureza</span>
                    <select
                      value={tipoLancamento}
                      onChange={(event) => {
                        setTipoLancamento(
                          event.target.value as 'TODOS' | 'CREDITO' | 'DEBITO',
                        );
                        setPaginaDetalhe(1);
                      }}
                    >
                      <option value="TODOS">Todos</option>
                      <option value="CREDITO">Créditos</option>
                      <option value="DEBITO">Débitos</option>
                    </select>
                  </label>
                  <label>
                    <span>De</span>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(event) => {
                        setDataInicio(event.target.value);
                        setPaginaDetalhe(1);
                      }}
                    />
                  </label>
                  <label>
                    <span>Até</span>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(event) => {
                        setDataFim(event.target.value);
                        setPaginaDetalhe(1);
                      }}
                    />
                  </label>
                  <span>{detalheQuery.data.totalLancamentos} lançamentos</span>
                </div>
                <div className="tabela-wrapper">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Data</th><th>Descrição</th><th>Crédito/débito</th><th>Valor</th>
                        <th>Saldo</th><th>Portador</th><th>Cartão</th><th>Parcela</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalheQuery.data.lancamentos.map((item) => (
                        <tr key={item.id}>
                          <td>{formatarData(item.data)}</td>
                          <td>{item.descricao}</td>
                          <td>{item.tipo === 'CREDITO' ? 'Crédito' : 'Débito'}</td>
                          <td>{formatarMoeda(item.valor)}</td>
                          <td>{formatarMoeda(item.saldoApos)}</td>
                          <td>{item.portadorNome ?? '—'}</td>
                          <td>{item.cartaoFinal ? `•••• ${item.cartaoFinal}` : '—'}</td>
                          <td>
                            {item.parcelaNumero && item.parcelaTotal
                              ? `${item.parcelaNumero}/${item.parcelaTotal}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <footer className="tabela-rodape">
                  <span>
                    Página {detalheQuery.data.pagina} de{' '}
                    {Math.max(1, Math.ceil(detalheQuery.data.totalLancamentos / detalheQuery.data.limite))}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="botao-tabela"
                      disabled={paginaDetalhe === 1 || detalheQuery.isFetching}
                      onClick={() => setPaginaDetalhe((atual) => Math.max(1, atual - 1))}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="botao-tabela"
                      disabled={
                        paginaDetalhe * detalheQuery.data.limite >= detalheQuery.data.totalLancamentos ||
                        detalheQuery.isFetching
                      }
                      onClick={() => setPaginaDetalhe((atual) => atual + 1)}
                    >
                      Próxima
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </AreaLayout>
  );
}
