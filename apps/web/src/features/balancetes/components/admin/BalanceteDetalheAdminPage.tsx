import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GrupoBalancete } from '@sindprf/types';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../../lib/datas';
import { FinanceiroSubnav } from '../../../financeiro/components/admin/FinanceiroSubnav';
import { useImportacaoBalancete } from '../../hooks';

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

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function percentual(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((Math.abs(parte) / total) * 100));
}

type FiltroTipo = 'todos' | 'RECEITA' | 'DESPESA';

function chaveGrupo(grupo: GrupoBalancete): string {
  return `${grupo.tipo}:${grupo.categoriaSlug}`;
}

export function BalanceteDetalheAdminPage() {
  const { id } = useParams<{ id: string }>();
  const { data: detalhe, isLoading, isError } = useImportacaoBalancete(id);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  const gruposFiltrados = useMemo(() => {
    if (!detalhe) return [] as GrupoBalancete[];
    if (filtroTipo === 'todos') return detalhe.grupos;
    return detalhe.grupos.filter((g) => g.tipo === filtroTipo);
  }, [detalhe, filtroTipo]);

  const gruposReceita = useMemo(
    () => gruposFiltrados.filter((g) => g.tipo === 'RECEITA'),
    [gruposFiltrados],
  );
  const gruposDespesa = useMemo(
    () => gruposFiltrados.filter((g) => g.tipo === 'DESPESA'),
    [gruposFiltrados],
  );

  const totalTipo = useMemo(() => {
    if (!detalhe) return { RECEITA: 0, DESPESA: 0 };
    return {
      RECEITA: detalhe.totalReceitas,
      DESPESA: detalhe.totalDespesas,
    };
  }, [detalhe]);

  function toggleGrupo(chave: string) {
    setAbertos((prev) => ({ ...prev, [chave]: !prev[chave] }));
  }

  function expandirTodos() {
    const mapa: Record<string, boolean> = {};
    for (const grupo of gruposFiltrados) mapa[chaveGrupo(grupo)] = true;
    setAbertos(mapa);
  }

  function recolherTodos() {
    setAbertos({});
  }

  if (isLoading) {
    return (
      <AreaLayout tipo="admin" titulo="Balancete" descricao="Carregando competência…">
        <EstadoCarregando mensagem="Carregando balancete…" />
      </AreaLayout>
    );
  }

  if (isError || !detalhe) {
    return (
      <AreaLayout tipo="admin" titulo="Balancete" descricao="Importação não encontrada.">
        <p className="erro">Não foi possível carregar este balancete.</p>
        <Link to="/admin/financeiro/balancetes" className="botao-secundario">
          Voltar aos balancetes
        </Link>
      </AreaLayout>
    );
  }

  const tituloMes = `${MESES[detalhe.competenciaMes - 1] ?? detalhe.competenciaMes} de ${detalhe.competenciaAno}`;
  const volume = detalhe.totalReceitas + detalhe.totalDespesas;
  const superavit = detalhe.resultado >= 0;
  const algumAberto = gruposFiltrados.some((g) => abertos[chaveGrupo(g)]);

  function renderGrupo(grupo: GrupoBalancete) {
    const chave = chaveGrupo(grupo);
    const aberto = Boolean(abertos[chave]);
    const base = totalTipo[grupo.tipo];
    const pct = percentual(grupo.total, base);

    return (
      <li key={chave} className={`bal-cat ${aberto ? 'bal-cat--aberta' : ''}`}>
        <button
          type="button"
          className="bal-cat-cabecalho"
          aria-expanded={aberto}
          onClick={() => toggleGrupo(chave)}
        >
          <span className="bal-cat-info">
            <span className={`bal-pill ${grupo.tipo === 'RECEITA' ? 'bal-pill--rec' : 'bal-pill--desp'}`}>
              {grupo.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}
            </span>
            <span className="bal-cat-nome">{grupo.categoriaNome}</span>
            <span className="bal-cat-qtd">
              {grupo.linhas.length} {grupo.linhas.length === 1 ? 'conta' : 'contas'}
              {pct > 0 ? ` · ${pct}%` : ''}
            </span>
          </span>
          <span className="bal-cat-direita">
            <strong
              className={grupo.tipo === 'RECEITA' ? 'bal-valor-receita' : 'bal-valor-despesa'}
            >
              {formatarMoeda(grupo.total)}
            </strong>
            <span className="bal-cat-chevron" aria-hidden="true">
              {aberto ? '−' : '+'}
            </span>
          </span>
        </button>

        <div className="bal-cat-barra-wrap" aria-hidden="true">
          <div
            className={`bal-cat-barra ${grupo.tipo === 'RECEITA' ? 'bal-cat-barra--rec' : 'bal-cat-barra--desp'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {aberto && (
          <div className="bal-tabela-wrap">
            <table className="bal-tabela">
              <thead>
                <tr>
                  <th scope="col">Conta</th>
                  <th scope="col">Descrição</th>
                  <th scope="col" className="bal-num">
                    Débitos
                  </th>
                  <th scope="col" className="bal-num">
                    Créditos
                  </th>
                  <th scope="col" className="bal-num">
                    Movimento
                  </th>
                </tr>
              </thead>
              <tbody>
                {grupo.linhas.map((linha) => (
                  <tr key={linha.id}>
                    <td>
                      <code className="bal-codigo">{linha.codigoConta}</code>
                    </td>
                    <td>{linha.descricao}</td>
                    <td className="bal-num">{formatarMoeda(linha.debitos)}</td>
                    <td className="bal-num">{formatarMoeda(linha.creditos)}</td>
                    <td className="bal-num bal-num--destaque">{formatarMoeda(linha.movimento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </li>
    );
  }

  function renderBloco(titulo: string, grupos: GrupoBalancete[], total: number) {
    if (grupos.length === 0) return null;
    return (
      <div className="bal-bloco-tipo">
        <div className="bal-bloco-tipo-topo">
          <h3 className="bal-bloco-tipo-titulo">{titulo}</h3>
          <strong>{formatarMoeda(total)}</strong>
        </div>
        <ul className="bal-cats">{grupos.map(renderGrupo)}</ul>
      </div>
    );
  }

  return (
    <AreaLayout
      tipo="admin"
      titulo={tituloMes}
      descricao={`${detalhe.arquivoNome} · importado em ${formatarDataHora(detalhe.createdAt)}`}
      acoes={
        <Link to="/admin/financeiro/balancetes" className="botao-secundario">
          Voltar
        </Link>
      }
    >
      <FinanceiroSubnav />

      <section className="bal-detalhe-resumo" aria-label="Resumo do mês">
        <div className="bal-detalhe-cards">
          <article className="bal-resumo-card">
            <p className="bal-resumo-rotulo">Receitas</p>
            <p className="bal-resumo-valor bal-resumo-valor--receita">
              {formatarMoeda(detalhe.totalReceitas)}
            </p>
          </article>
          <article className="bal-resumo-card">
            <p className="bal-resumo-rotulo">Despesas</p>
            <p className="bal-resumo-valor bal-resumo-valor--despesa">
              {formatarMoeda(detalhe.totalDespesas)}
            </p>
          </article>
          <article className="bal-resumo-card bal-resumo-card--resultado">
            <p className="bal-resumo-rotulo">Resultado</p>
            <p className={`bal-resumo-valor ${superavit ? 'bal-valor-pos' : 'bal-valor-neg'}`}>
              {formatarMoeda(detalhe.resultado)}
            </p>
            <p className="bal-resumo-detalhe">{superavit ? 'Superávit no mês' : 'Déficit no mês'}</p>
          </article>
        </div>

        {volume > 0 && (
          <div className="bal-composicao">
            <div className="bal-composicao-legendas">
              <span>
                Receitas {percentual(detalhe.totalReceitas, volume)}%
              </span>
              <span>
                Despesas {percentual(detalhe.totalDespesas, volume)}%
              </span>
            </div>
            <div className="bal-barra bal-barra--lg" aria-hidden="true">
              <span
                className="bal-barra-receita"
                style={{ width: `${percentual(detalhe.totalReceitas, volume)}%` }}
              />
              <span
                className="bal-barra-despesa"
                style={{ width: `${percentual(detalhe.totalDespesas, volume)}%` }}
              />
            </div>
          </div>
        )}
      </section>

      <section className="bal-detalhe-categorias">
        <div className="bal-detalhe-toolbar">
          <div>
            <p className="eyebrow">Movimento do mês</p>
            <h2 className="bal-secao-titulo">Por categoria</h2>
            <p className="bal-secao-texto">
              Valores do período (não o acumulado do exercício). Expanda para ver as contas Fortes.
            </p>
          </div>

          <div className="bal-detalhe-controles">
            <div className="bal-segmentos" role="tablist" aria-label="Filtrar por tipo">
              {(
                [
                  ['todos', 'Todos'],
                  ['RECEITA', 'Receitas'],
                  ['DESPESA', 'Despesas'],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  role="tab"
                  aria-selected={filtroTipo === valor}
                  className={`bal-segmento ${filtroTipo === valor ? 'bal-segmento--ativo' : ''}`}
                  onClick={() => setFiltroTipo(valor)}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="botao-secundario bal-btn-expandir"
              onClick={algumAberto ? recolherTodos : expandirTodos}
              disabled={gruposFiltrados.length === 0}
            >
              {algumAberto ? 'Recolher tudo' : 'Expandir tudo'}
            </button>
          </div>
        </div>

        {gruposFiltrados.length === 0 ? (
          <div className="estado-vazio bal-vazio">
            <p className="bal-vazio-titulo">Nenhuma categoria neste filtro</p>
            <p>Troque o filtro ou importe novamente o PDF do mês.</p>
          </div>
        ) : filtroTipo === 'todos' ? (
          <>
            {renderBloco('Receitas', gruposReceita, detalhe.totalReceitas)}
            {renderBloco('Despesas', gruposDespesa, detalhe.totalDespesas)}
          </>
        ) : (
          <ul className="bal-cats">{gruposFiltrados.map(renderGrupo)}</ul>
        )}
      </section>
    </AreaLayout>
  );
}
