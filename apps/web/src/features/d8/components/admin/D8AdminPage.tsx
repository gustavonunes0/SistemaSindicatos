import { isAxiosError } from 'axios';
import { useState } from 'react';
import type { TipoD8 } from '@sindprf/types';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { FinanceiroSubnav } from '../../../financeiro/components/admin/FinanceiroSubnav';
import { useImportacoesD8, useImportarD8 } from '../../hooks';
import { CompetenciasD8Lista } from './CompetenciasD8Lista';

const rotuloTipo: Record<TipoD8, string> = {
  SERVIDOR: 'Servidor',
  PENSIONISTA: 'Pensionista',
};

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
  return 'Falha ao importar o PDF D8.';
}

export function D8AdminPage() {
  const { data: importacoes, isLoading, isError } = useImportacoesD8();
  const importar = useImportarD8();

  const [tipo, setTipo] = useState<TipoD8>('SERVIDOR');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultadoMsg, setResultadoMsg] = useState<string | null>(null);

  function executarImportacao() {
    if (!arquivo) return;

    void importar.mutateAsync(
      { arquivo, tipo },
      {
        onSuccess: (resultado) => {
          setResultadoMsg(
            `${rotuloTipo[resultado.importacao.tipo]} ${formatarCompetencia(
              resultado.importacao.competenciaMes,
              resultado.importacao.competenciaAno,
            )}: ${resultado.resumo.totalLinhas} linhas · ${formatarMoeda(resultado.resumo.totalValor)} · ${resultado.resumo.criados} criados · ${resultado.resumo.inativados} inativados. Senha temporária dos novos: D8_SENHA_TEMP (padrão Sindprf@D8).`,
          );
          setArquivo(null);
        },
      },
    );
  }

  return (
    <AreaLayout
      tipo="admin"
      titulo="Importação D8"
      descricao="Importe os relatórios SIAPE de mensalidade sindical e sincronize a base de afiliados."
    >
      <FinanceiroSubnav />

      <section className="d8-admin-upload">
        <h2 className="d8-admin-secao-titulo">Nova importação</h2>
        <p className="d8-admin-secao-texto">
          Envie o PDF de servidor ou pensionista. O texto é lido no navegador; a competência vem do
          arquivo. Quem está no D8 fica aprovado; aprovados/inativos ausentes na competência ficam
          inativos.
        </p>

        <div className="d8-admin-form">
          <label>
            Tipo
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as TipoD8)}
              disabled={importar.isPending}
            >
              <option value="SERVIDOR">Servidor</option>
              <option value="PENSIONISTA">Pensionista</option>
            </select>
          </label>

          <label className="d8-admin-arquivo">
            Arquivo PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={importar.isPending}
              onChange={(event) => setArquivo(event.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="button"
            className="botao-primario"
            disabled={!arquivo || importar.isPending}
            onClick={executarImportacao}
          >
            {importar.isPending ? 'Importando…' : 'Importar PDF'}
          </button>
        </div>

        {importar.isError && <p className="erro">{mensagemErro(importar.error)}</p>}
        {resultadoMsg && <p className="d8-admin-sucesso">{resultadoMsg}</p>}
      </section>

      <section className="d8-admin-lista-bloco">
        {isLoading && <EstadoCarregando mensagem="Carregando importações…" />}
        {isError && <p className="erro">Não foi possível carregar as importações.</p>}

        {importacoes && importacoes.length === 0 && (
          <div className="estado-vazio">
            <p>Nenhum D8 importado ainda.</p>
          </div>
        )}

        {importacoes && importacoes.length > 0 && (
          <CompetenciasD8Lista importacoes={importacoes} />
        )}
      </section>
    </AreaLayout>
  );
}
