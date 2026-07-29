import { Link } from 'react-router-dom';
import type { ImportacaoBalancete } from '@sindprf/types';
import { formatarDataHora } from '../../../../lib/datas';

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

function nomeCompetencia(mes: number, ano: number): string {
  return `${MESES[mes - 1] ?? mes} de ${ano}`;
}

function percentual(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((parte / total) * 100));
}

type CompetenciasBalanceteListaProps = {
  importacoes: ImportacaoBalancete[];
};

export function CompetenciasBalanceteLista({ importacoes }: CompetenciasBalanceteListaProps) {
  const ordenadas = [...importacoes].sort(
    (a, b) => b.competenciaAno - a.competenciaAno || b.competenciaMes - a.competenciaMes,
  );

  const totais = ordenadas.reduce(
    (acc, item) => {
      acc.receitas += item.totalReceitas;
      acc.despesas += item.totalDespesas;
      return acc;
    },
    { receitas: 0, despesas: 0 },
  );
  const resultadoGeral = totais.receitas - totais.despesas;
  const volumeGeral = totais.receitas + totais.despesas;

  const porAno = ordenadas.reduce<Record<number, ImportacaoBalancete[]>>((acc, item) => {
    (acc[item.competenciaAno] ??= []).push(item);
    return acc;
  }, {});
  const anos = Object.keys(porAno)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="bal-competencias">
      <header className="bal-competencias-topo">
        <div>
          <p className="eyebrow">Competências</p>
          <h2 className="bal-secao-titulo">Meses importados</h2>
          <p className="bal-secao-texto">
            Abra um mês para ver o detalhamento por tipo e categoria contábil.
          </p>
        </div>
      </header>

      <div className="bal-resumo" aria-label="Totais do período importado">
        <article className="bal-resumo-card">
          <p className="bal-resumo-rotulo">Meses</p>
          <p className="bal-resumo-valor">{ordenadas.length}</p>
        </article>
        <article className="bal-resumo-card">
          <p className="bal-resumo-rotulo">Receitas</p>
          <p className="bal-resumo-valor bal-resumo-valor--receita">{formatarMoeda(totais.receitas)}</p>
        </article>
        <article className="bal-resumo-card">
          <p className="bal-resumo-rotulo">Despesas</p>
          <p className="bal-resumo-valor bal-resumo-valor--despesa">{formatarMoeda(totais.despesas)}</p>
        </article>
        <article className="bal-resumo-card bal-resumo-card--resultado">
          <p className="bal-resumo-rotulo">Resultado</p>
          <p
            className={`bal-resumo-valor ${resultadoGeral >= 0 ? 'bal-valor-pos' : 'bal-valor-neg'}`}
          >
            {formatarMoeda(resultadoGeral)}
          </p>
          {volumeGeral > 0 && (
            <div
              className="bal-barra"
              aria-hidden="true"
              title={`Receitas ${percentual(totais.receitas, volumeGeral)}% · Despesas ${percentual(totais.despesas, volumeGeral)}%`}
            >
              <span
                className="bal-barra-receita"
                style={{ width: `${percentual(totais.receitas, volumeGeral)}%` }}
              />
              <span
                className="bal-barra-despesa"
                style={{ width: `${percentual(totais.despesas, volumeGeral)}%` }}
              />
            </div>
          )}
        </article>
      </div>

      {anos.map((ano) => (
        <section key={ano} className="bal-ano" aria-labelledby={`bal-ano-${ano}`}>
          {anos.length > 1 && (
            <h3 className="bal-ano-titulo" id={`bal-ano-${ano}`}>
              {ano}
            </h3>
          )}
          <ul className="bal-meses">
            {(porAno[ano] ?? []).map((item) => {
              const volume = item.totalReceitas + item.totalDespesas;
              const pctRec = percentual(item.totalReceitas, volume);
              const pctDesp = percentual(item.totalDespesas, volume);
              const superavit = item.resultado >= 0;

              return (
                <li key={item.id}>
                  <Link className="bal-mes" to={`/admin/financeiro/balancetes/${item.id}`}>
                    <div className="bal-mes-cabecalho">
                      <div>
                        <h3 className="bal-mes-titulo">
                          {nomeCompetencia(item.competenciaMes, item.competenciaAno)}
                        </h3>
                        <p className="bal-mes-meta">
                          {String(item.competenciaMes).padStart(2, '0')}/{item.competenciaAno}
                          {' · '}
                          {item.totalLinhas} contas
                          {' · '}
                          {formatarDataHora(item.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`bal-status ${superavit ? 'bal-status--ok' : 'bal-status--alerta'}`}
                      >
                        {superavit ? 'Superávit' : 'Déficit'}
                      </span>
                    </div>

                    <div className="bal-mes-valores">
                      <div>
                        <span>Receitas</span>
                        <strong className="bal-valor-receita">
                          {formatarMoeda(item.totalReceitas)}
                        </strong>
                      </div>
                      <div>
                        <span>Despesas</span>
                        <strong className="bal-valor-despesa">
                          {formatarMoeda(item.totalDespesas)}
                        </strong>
                      </div>
                      <div>
                        <span>Resultado</span>
                        <strong className={superavit ? 'bal-valor-pos' : 'bal-valor-neg'}>
                          {formatarMoeda(item.resultado)}
                        </strong>
                      </div>
                    </div>

                    {volume > 0 && (
                      <div className="bal-barra bal-barra--mes" aria-hidden="true">
                        <span className="bal-barra-receita" style={{ width: `${pctRec}%` }} />
                        <span className="bal-barra-despesa" style={{ width: `${pctDesp}%` }} />
                      </div>
                    )}

                    <div className="bal-mes-rodape">
                      <span className="bal-mes-arquivo" title={item.arquivoNome}>
                        {item.arquivoNome}
                      </span>
                      <span className="bal-mes-cta">Abrir categorias</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
