import { isAxiosError } from 'axios';
import { useRef, useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { FinanceiroSubnav } from '../../../financeiro/components/admin/FinanceiroSubnav';
import { useImportacoesBalancete, useImportarBalancete } from '../../hooks';
import { CompetenciasBalanceteLista } from './CompetenciasBalanceteLista';

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarCompetencia(mes: number, ano: number): string {
  return `${String(mes).padStart(2, '0')}/${ano}`;
}

function mensagemErro(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return 'Não foi possível importar o PDF. Confira se é um balancete Fortes válido.';
}

export function BalancetesAdminPage() {
  const { data: importacoes, isLoading, isError } = useImportacoesBalancete();
  const importar = useImportarBalancete();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [resultadoMsg, setResultadoMsg] = useState<string | null>(null);

  function selecionarArquivo(file: File | null) {
    if (!file) {
      setArquivo(null);
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setArquivo(null);
      return;
    }
    setArquivo(file);
    setResultadoMsg(null);
  }

  function executarImportacao() {
    if (!arquivo) return;

    void importar.mutateAsync(
      { arquivo },
      {
        onSuccess: (resultado) => {
          const { importacao } = resultado;
          setResultadoMsg(
            `${formatarCompetencia(importacao.competenciaMes, importacao.competenciaAno)} importado: ${formatarMoeda(importacao.totalReceitas)} em receitas e ${formatarMoeda(importacao.totalDespesas)} em despesas.`,
          );
          setArquivo(null);
          if (inputRef.current) inputRef.current.value = '';
        },
      },
    );
  }

  return (
    <AreaLayout
      tipo="admin"
      titulo="Balancetes"
      descricao="Importação mensal do Fortes Contábil e visão de receitas e despesas por categoria."
    >
      <FinanceiroSubnav />

      <section
        className={`bal-upload ${arrastando ? 'bal-upload--ativo' : ''} ${arquivo ? 'bal-upload--com-arquivo' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setArrastando(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setArrastando(false);
          selecionarArquivo(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <div className="bal-upload-texto">
          <p className="eyebrow">Importar PDF</p>
          <h2 className="bal-upload-titulo">Arraste o balancete do mês</h2>
          <p className="bal-upload-desc">
            A competência é lida do período do arquivo. Se o mês já existir, os dados anteriores são
            substituídos.
          </p>
          {arquivo && (
            <p className="bal-upload-arquivo" title={arquivo.name}>
              {arquivo.name}
            </p>
          )}
        </div>

        <div className="bal-upload-acoes">
          <input
            ref={inputRef}
            id="bal-arquivo-pdf"
            type="file"
            accept="application/pdf,.pdf"
            disabled={importar.isPending}
            className="bal-upload-input"
            onChange={(event) => selecionarArquivo(event.target.files?.[0] ?? null)}
          />
          <label htmlFor="bal-arquivo-pdf" className="botao-secundario bal-upload-escolher">
            Escolher PDF
          </label>
          <button
            type="button"
            className="botao-primario"
            disabled={!arquivo || importar.isPending}
            onClick={executarImportacao}
          >
            {importar.isPending ? 'Importando…' : 'Importar mês'}
          </button>
        </div>
      </section>

      {importar.isError && <p className="erro bal-feedback">{mensagemErro(importar.error)}</p>}
      {resultadoMsg && <p className="bal-feedback bal-feedback--ok" role="status">{resultadoMsg}</p>}

      <section className="bal-lista-secao">
        {isLoading && <EstadoCarregando mensagem="Carregando balancetes…" />}
        {isError && (
          <p className="erro">Não foi possível carregar os balancetes. Tente novamente.</p>
        )}

        {importacoes && importacoes.length === 0 && !isLoading && (
          <div className="estado-vazio bal-vazio">
            <p className="bal-vazio-titulo">Nenhum balancete importado</p>
            <p>Envie o primeiro PDF Fortes para começar a acompanhar o mês por categoria.</p>
          </div>
        )}

        {importacoes && importacoes.length > 0 && (
          <CompetenciasBalanceteLista importacoes={importacoes} />
        )}
      </section>
    </AreaLayout>
  );
}
