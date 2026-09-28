import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CategoriaTransparencia } from '@sindprf/types';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../lib/datas';
import { formatarMoeda, nomeCompetencia, percentual } from '../formatacao';
import { useBalanceteTransparencia } from '../hooks';

type FiltroTipo = 'todos' | 'RECEITA' | 'DESPESA';

export function TransparenciaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useBalanceteTransparencia(id);
  const [filtro, setFiltro] = useState<FiltroTipo>('todos');

  const categorias = useMemo(() => {
    if (!data) return [] as CategoriaTransparencia[];
    if (filtro === 'todos') return data.categorias;
    return data.categorias.filter((item) => item.tipo === filtro);
  }, [data, filtro]);

  const receitas = useMemo(
    () => categorias.filter((item) => item.tipo === 'RECEITA'),
    [categorias],
  );
  const despesas = useMemo(
    () => categorias.filter((item) => item.tipo === 'DESPESA'),
    [categorias],
  );

  if (isLoading) {
    return (
      <AreaLayout tipo="afiliado" titulo="Transparência" descricao="Carregando competência…">
        <EstadoCarregando mensagem="Carregando balancete…" />
      </AreaLayout>
    );
  }

  if (isError || !data) {
    return (
      <AreaLayout tipo="afiliado" titulo="Transparência" descricao="Competência não encontrada.">
        <p className="erro">Não foi possível carregar este mês.</p>
        <Link to="/afiliado/transparencia" className="botao-secundario">
          Voltar
        </Link>
      </AreaLayout>
    );
  }

  const titulo = nomeCompetencia(data.competenciaMes, data.competenciaAno);

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={titulo}
      descricao="Receitas e despesas por categoria neste mês."
      acoes={
        <Link to="/afiliado/transparencia" className="botao-secundario">
          Todos os meses
        </Link>
      }
    >
      <div className="tp-portal">
        <section className="bal-resumo" aria-label={`Resumo de ${titulo}`}>
          <article className="bal-resumo-card">
            <p className="bal-resumo-rotulo">Receitas</p>
            <p className="bal-resumo-valor bal-resumo-valor--receita">
              {formatarMoeda(data.totalReceitas)}
            </p>
          </article>
          <article className="bal-resumo-card">
            <p className="bal-resumo-rotulo">Despesas</p>
            <p className="bal-resumo-valor bal-resumo-valor--despesa">
              {formatarMoeda(data.totalDespesas)}
            </p>
          </article>
          <article className="bal-resumo-card bal-resumo-card--resultado">
            <p className="bal-resumo-rotulo">Resultado</p>
            <p
              className={`bal-resumo-valor ${data.resultado >= 0 ? 'bal-valor-pos' : 'bal-valor-neg'}`}
            >
              {formatarMoeda(data.resultado)}
            </p>
          </article>
          <article className="bal-resumo-card">
            <p className="bal-resumo-rotulo">Publicado em</p>
            <p className="bal-resumo-valor bal-resumo-valor--data">
              {formatarData(data.publicadoEm)}
            </p>
          </article>
        </section>

        <div className="tp-filtros" role="group" aria-label="Filtrar por tipo">
          {(
            [
              ['todos', 'Tudo'],
              ['RECEITA', 'Receitas'],
              ['DESPESA', 'Despesas'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              className={filtro === valor ? 'botao-filtro botao-filtro--ativo' : 'botao-filtro'}
              onClick={() => setFiltro(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {receitas.length > 0 && (
          <ListaCategorias
            titulo="Receitas"
            categorias={receitas}
            totalBase={data.totalReceitas}
            tom="receita"
          />
        )}
        {despesas.length > 0 && (
          <ListaCategorias
            titulo="Despesas"
            categorias={despesas}
            totalBase={data.totalDespesas}
            tom="despesa"
          />
        )}
        {categorias.length === 0 && (
          <div className="estado-vazio estado-vazio--compacto">
            <p>Nenhuma categoria neste filtro.</p>
          </div>
        )}
      </div>
    </AreaLayout>
  );
}

function ListaCategorias({
  titulo,
  categorias,
  totalBase,
  tom,
}: {
  titulo: string;
  categorias: CategoriaTransparencia[];
  totalBase: number;
  tom: 'receita' | 'despesa';
}) {
  return (
    <section className="tp-categorias" aria-labelledby={`tp-cat-${tom}`}>
      <h2 id={`tp-cat-${tom}`} className="tp-ano-titulo">
        {titulo}
      </h2>
      <ul className="tp-cat-lista">
        {categorias.map((categoria) => {
          const pct = percentual(categoria.total, totalBase);
          return (
            <li key={`${categoria.tipo}:${categoria.categoriaSlug}`} className="tp-cat">
              <div className="tp-cat-topo">
                <strong>{categoria.categoriaNome}</strong>
                <span>{formatarMoeda(categoria.total)}</span>
              </div>
              <div className="tp-cat-barra" aria-hidden="true">
                <span
                  className={`tp-cat-barra-preenchimento tp-cat-barra-preenchimento--${tom}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="tp-cat-pct">{pct}% do total</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
