import { isAxiosError } from 'axios';
import { useState } from 'react';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../../lib/datas';
import { useAcoesJuridicasAdmin, useImportacoesJuridico, useImportarPlanilhaJuridico } from '../../hooks';

function formatarCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function mensagemErro(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return 'Falha ao importar a planilha.';
}

export function JuridicoAcoesAdminPanel() {
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultadoMsg, setResultadoMsg] = useState<string | null>(null);

  const { data: acoes, isLoading, isError } = useAcoesJuridicasAdmin({ busca: buscaAplicada || undefined });
  const { data: importacoes } = useImportacoesJuridico();
  const importar = useImportarPlanilhaJuridico();

  function executarImportacao() {
    if (!arquivo) return;

    void importar.mutateAsync(arquivo, {
      onSuccess: (resultado) => {
        setResultadoMsg(
          `${resultado.resumo.totalLinhas} linha(s): ${resultado.resumo.novas} nova(s), ${resultado.resumo.atualizadas} atualizada(s). ${resultado.resumo.vinculados} vinculada(s) a filiados cadastrados.`,
        );
        setArquivo(null);
      },
    });
  }

  return (
    <>
      <section className="juridico-admin-upload">
        <h2 className="juridico-admin-secao-titulo">Importar ações</h2>
        <p className="juridico-admin-secao-texto">
          Envie uma planilha Excel (.xlsx ou .xls) com as colunas{' '}
          <strong>Nome</strong>, <strong>CPF</strong>, <strong>Nº da ação</strong> e{' '}
          <strong>status</strong> na primeira linha. Reimportar atualiza ações existentes pelo
          número do processo.
        </p>

        <div className="juridico-admin-form">
          <label className="juridico-admin-arquivo">
            Planilha Excel
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
            {importar.isPending ? 'Importando…' : 'Importar planilha'}
          </button>
        </div>

        {importar.isError && <p className="erro">{mensagemErro(importar.error)}</p>}
        {resultadoMsg && <p className="sucesso">{resultadoMsg}</p>}
      </section>

      {importacoes && importacoes.length > 0 && (
        <section className="juridico-admin-historico">
          <h2 className="juridico-admin-secao-titulo">Últimas importações</h2>
          <ul className="juridico-admin-importacoes">
            {importacoes.slice(0, 5).map((item) => (
              <li key={item.id}>
                <span>{item.arquivoNome}</span>
                <span className="texto-secundario">
                  {formatarData(item.createdAt)} · {item.totalLinhas} linha(s) · {item.novas}{' '}
                  nova(s) · {item.atualizadas} atualizada(s)
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="juridico-admin-lista">
        <div className="juridico-admin-lista-topo">
          <h2 className="juridico-admin-secao-titulo">Ações cadastradas</h2>
          <form
            className="juridico-admin-busca"
            onSubmit={(event) => {
              event.preventDefault();
              setBuscaAplicada(busca.trim());
            }}
          >
            <label>
              Buscar
              <input
                type="search"
                value={busca}
                placeholder="Nome, CPF, nº da ação ou status…"
                onChange={(event) => setBusca(event.target.value)}
              />
            </label>
            <button type="submit" className="botao-secundario">
              Filtrar
            </button>
          </form>
        </div>

        {isLoading && !acoes && <EstadoCarregando />}
        {isError && !acoes && <p className="erro">Erro ao carregar as ações.</p>}

        {acoes && acoes.length === 0 && (
          <div className="estado-vazio">
            <p>Nenhuma ação cadastrada ainda.</p>
          </div>
        )}

        {acoes && acoes.length > 0 && (
          <div className="tabela-responsiva">
            <table className="tabela-dados">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Nº da ação</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {acoes.map((acao) => (
                  <tr key={acao.id}>
                    <td>{acao.nome}</td>
                    <td className="tabela-numerico">{formatarCpf(acao.cpf)}</td>
                    <td className="tabela-numerico">{acao.numeroAcao}</td>
                    <td>{acao.status}</td>
                    <td>{formatarData(acao.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
