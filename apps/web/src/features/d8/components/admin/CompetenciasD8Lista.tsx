import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ImportacaoD8, TipoD8 } from '@sindprf/types';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarDataHora } from '../../../../lib/datas';
import { useExcluirD8 } from '../../hooks';

const rotuloTipo: Record<TipoD8, string> = {
  SERVIDOR: 'Servidor',
  PENSIONISTA: 'Pensionista',
};

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

type FiltroTipo = 'todos' | TipoD8;
type FiltroCompletude = 'todos' | 'completa' | 'incompleta';

type CompetenciaGrupo = {
  chave: string;
  ano: number;
  mes: number;
  importacoes: ImportacaoD8[];
  totalLinhas: number;
  totalValor: number;
  temServidor: boolean;
  temPensionista: boolean;
  completa: boolean;
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function nomeCompetencia(mes: number, ano: number): string {
  return `${MESES[mes - 1] ?? mes} de ${ano}`;
}

function chaveCompetencia(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

function agruparPorCompetencia(importacoes: ImportacaoD8[]): CompetenciaGrupo[] {
  const mapa = new Map<string, CompetenciaGrupo>();

  for (const item of importacoes) {
    const chave = chaveCompetencia(item.competenciaAno, item.competenciaMes);
    const atual = mapa.get(chave);
    if (!atual) {
      mapa.set(chave, {
        chave,
        ano: item.competenciaAno,
        mes: item.competenciaMes,
        importacoes: [item],
        totalLinhas: item.totalLinhas,
        totalValor: item.totalValor,
        temServidor: item.tipo === 'SERVIDOR',
        temPensionista: item.tipo === 'PENSIONISTA',
        completa: false,
      });
      continue;
    }

    atual.importacoes.push(item);
    atual.totalLinhas += item.totalLinhas;
    atual.totalValor += item.totalValor;
    if (item.tipo === 'SERVIDOR') atual.temServidor = true;
    if (item.tipo === 'PENSIONISTA') atual.temPensionista = true;
  }

  return [...mapa.values()]
    .map((grupo) => ({
      ...grupo,
      completa: grupo.temServidor && grupo.temPensionista,
      importacoes: [...grupo.importacoes].sort((a, b) => a.tipo.localeCompare(b.tipo)),
    }))
    .sort((a, b) => b.ano - a.ano || b.mes - a.mes);
}

type CompetenciasD8ListaProps = {
  importacoes: ImportacaoD8[];
};

export function CompetenciasD8Lista({ importacoes }: CompetenciasD8ListaProps) {
  const [filtroAno, setFiltroAno] = useState<'todos' | string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroCompletude, setFiltroCompletude] = useState<FiltroCompletude>('todos');
  const [busca, setBusca] = useState('');
  const [erroExclusao, setErroExclusao] = useState<string>();
  const excluir = useExcluirD8();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const anosDisponiveis = [...new Set(importacoes.map((item) => item.competenciaAno))].sort(
    (a, b) => b - a,
  );

  const termo = busca.trim().toLowerCase();
  const filtradas = importacoes.filter((item) => {
    if (filtroAno !== 'todos' && String(item.competenciaAno) !== filtroAno) return false;
    if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
    if (!termo) return true;
    return (
      item.arquivoNome.toLowerCase().includes(termo) ||
      rotuloTipo[item.tipo].toLowerCase().includes(termo) ||
      nomeCompetencia(item.competenciaMes, item.competenciaAno).toLowerCase().includes(termo)
    );
  });

  const grupos = agruparPorCompetencia(filtradas).filter((grupo) => {
    if (filtroCompletude === 'completa') return grupo.completa;
    if (filtroCompletude === 'incompleta') return !grupo.completa;
    return true;
  });

  const resumo = grupos.reduce(
    (acc, grupo) => {
      acc.competencias += 1;
      acc.linhas += grupo.totalLinhas;
      acc.valor += grupo.totalValor;
      if (grupo.completa) acc.completas += 1;
      return acc;
    },
    { competencias: 0, linhas: 0, valor: 0, completas: 0 },
  );

  const filtrosAtivos =
    filtroAno !== 'todos' || filtroTipo !== 'todos' || filtroCompletude !== 'todos' || busca.trim();

  function limparFiltros() {
    setFiltroAno('todos');
    setFiltroTipo('todos');
    setFiltroCompletude('todos');
    setBusca('');
  }

  function confirmarExclusao(item: ImportacaoD8) {
    const competencia = nomeCompetencia(item.competenciaMes, item.competenciaAno);
    setErroExclusao(undefined);
    pedirConfirmacao({
      titulo: `Excluir D8 de ${rotuloTipo[item.tipo].toLowerCase()}?`,
      descricao: `Serão removidos os ${item.totalLinhas.toLocaleString('pt-BR')} registros de ${rotuloTipo[item.tipo].toLowerCase()} de ${competencia}. Os cadastros de afiliados não são apagados. Esta ação não pode ser desfeita.`,
      confirmarRotulo: 'Excluir importação',
      tom: 'perigo',
      onConfirmar: async () => {
        try {
          await excluir.mutateAsync(item.id);
        } catch {
          setErroExclusao('Não foi possível excluir a importação. Tente novamente.');
        }
      },
    });
  }

  function confirmarExclusaoMes(grupo: CompetenciaGrupo) {
    setErroExclusao(undefined);
    pedirConfirmacao({
      titulo: `Excluir ${nomeCompetencia(grupo.mes, grupo.ano)}?`,
      descricao: `Serão removidas todas as importações D8 deste mês (${grupo.importacoes
        .map((item) => rotuloTipo[item.tipo].toLowerCase())
        .join(' e ')}). Os cadastros de afiliados não são apagados. Esta ação não pode ser desfeita.`,
      confirmarRotulo: 'Excluir mês',
      tom: 'perigo',
      onConfirmar: async () => {
        try {
          for (const item of grupo.importacoes) {
            await excluir.mutateAsync(item.id);
          }
        } catch {
          setErroExclusao('Não foi possível excluir o mês completo. Tente novamente.');
        }
      },
    });
  }

  return (
    <div className="d8-competencias">
      <div className="d8-competencias-topo">
        <div>
          <h2 className="d8-admin-secao-titulo">Competências importadas</h2>
          <p className="d8-admin-secao-texto">
            Agrupadas por mês. Uma competência completa tem servidor e pensionista. Use Excluir
            para remover um tipo importado por engano.
          </p>
        </div>
        {filtrosAtivos && (
          <button type="button" className="botao-secundario" onClick={limparFiltros}>
            Limpar filtros
          </button>
        )}
      </div>

      <div className="d8-competencias-filtros" role="search" aria-label="Filtrar competências">
        <label>
          Ano
          <select value={filtroAno} onChange={(event) => setFiltroAno(event.target.value)}>
            <option value="todos">Todos</option>
            {anosDisponiveis.map((ano) => (
              <option key={ano} value={String(ano)}>
                {ano}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tipo
          <select
            value={filtroTipo}
            onChange={(event) => setFiltroTipo(event.target.value as FiltroTipo)}
          >
            <option value="todos">Todos</option>
            <option value="SERVIDOR">Servidor</option>
            <option value="PENSIONISTA">Pensionista</option>
          </select>
        </label>

        <label>
          Completude
          <select
            value={filtroCompletude}
            onChange={(event) => setFiltroCompletude(event.target.value as FiltroCompletude)}
          >
            <option value="todos">Todas</option>
            <option value="completa">Completas</option>
            <option value="incompleta">Incompletas</option>
          </select>
        </label>

        <label className="d8-competencias-busca">
          Busca
          <input
            type="search"
            value={busca}
            placeholder="Arquivo, mês ou tipo…"
            onChange={(event) => setBusca(event.target.value)}
          />
        </label>
      </div>

      <div className="d8-competencias-resumo" aria-live="polite">
        <div>
          <span className="d8-admin-metrica-rotulo">Competências</span>
          <strong>{resumo.competencias}</strong>
        </div>
        <div>
          <span className="d8-admin-metrica-rotulo">Completas</span>
          <strong>
            {resumo.completas}
            <span className="d8-competencias-resumo-sufixo">/{resumo.competencias || 0}</span>
          </strong>
        </div>
        <div>
          <span className="d8-admin-metrica-rotulo">Registros</span>
          <strong>{resumo.linhas.toLocaleString('pt-BR')}</strong>
        </div>
        <div>
          <span className="d8-admin-metrica-rotulo">Arrecadação filtrada</span>
          <strong>{formatarMoeda(resumo.valor)}</strong>
        </div>
      </div>

      {erroExclusao && <p className="erro">{erroExclusao}</p>}

      {grupos.length === 0 ? (
        <div className="estado-vazio">
          <p>Nenhuma competência corresponde aos filtros.</p>
        </div>
      ) : (
        <ul className="d8-competencias-grupos">
          {grupos.map((grupo) => (
            <li key={grupo.chave} className="d8-competencia-grupo">
              <header className="d8-competencia-grupo-cabecalho">
                <div>
                  <h3>{nomeCompetencia(grupo.mes, grupo.ano)}</h3>
                  <p>
                    {String(grupo.mes).padStart(2, '0')}/{grupo.ano} ·{' '}
                    {grupo.totalLinhas.toLocaleString('pt-BR')} registros ·{' '}
                    {formatarMoeda(grupo.totalValor)}
                  </p>
                </div>
                <div className="d8-competencia-grupo-badges">
                  <span
                    className={`badge ${grupo.temServidor ? 'd8-badge-ok' : 'd8-badge-faltando'}`}
                  >
                    Servidor {grupo.temServidor ? 'ok' : 'faltando'}
                  </span>
                  <span
                    className={`badge ${grupo.temPensionista ? 'd8-badge-ok' : 'd8-badge-faltando'}`}
                  >
                    Pensionista {grupo.temPensionista ? 'ok' : 'faltando'}
                  </span>
                  <span
                    className={`badge ${grupo.completa ? 'd8-badge-completa' : 'd8-badge-incompleta'}`}
                  >
                    {grupo.completa ? 'Completa' : 'Incompleta'}
                  </span>
                  {grupo.importacoes.length > 1 && (
                    <button
                      type="button"
                      className="botao-tabela botao-tabela--perigo"
                      disabled={excluir.isPending}
                      onClick={() => confirmarExclusaoMes(grupo)}
                    >
                      Excluir mês
                    </button>
                  )}
                </div>
              </header>

              <ul className="d8-competencia-grupo-itens">
                {grupo.importacoes.map((item) => (
                  <li key={item.id} className="d8-competencia-item-wrap">
                    <Link
                      className="d8-admin-item d8-competencia-item"
                      to={`/admin/financeiro/d8/${item.id}`}
                    >
                      <div className="d8-admin-item-topo">
                        <h4>{rotuloTipo[item.tipo]}</h4>
                        <span className="badge">{item.totalLinhas} registros</span>
                      </div>
                      <dl className="d8-admin-item-meta">
                        <div>
                          <dt>Total</dt>
                          <dd>{formatarMoeda(item.totalValor)}</dd>
                        </div>
                        <div>
                          <dt>Arquivo</dt>
                          <dd title={item.arquivoNome}>{item.arquivoNome}</dd>
                        </div>
                        <div>
                          <dt>Importado em</dt>
                          <dd>{formatarDataHora(item.createdAt)}</dd>
                        </div>
                      </dl>
                      <span className="d8-admin-item-cta">Analisar →</span>
                    </Link>
                    <div className="d8-competencia-item-acoes">
                      <button
                        type="button"
                        className="botao-tabela botao-tabela--perigo"
                        disabled={excluir.isPending}
                        onClick={() => confirmarExclusao(item)}
                      >
                        Excluir {rotuloTipo[item.tipo].toLowerCase()}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {modalConfirmacao}
    </div>
  );
}
