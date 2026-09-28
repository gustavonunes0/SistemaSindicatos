import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarMoeda, nomeCompetencia, percentual } from '../formatacao';
import { useBalancetesTransparencia } from '../hooks';

export function TransparenciaPage() {
  const { data, isLoading, isError } = useBalancetesTransparencia();
  const itens = data ?? [];

  const totais = itens.reduce(
    (acc, item) => {
      acc.receitas += item.totalReceitas;
      acc.despesas += item.totalDespesas;
      return acc;
    },
    { receitas: 0, despesas: 0 },
  );
  const resultado = totais.receitas - totais.despesas;
  const volume = totais.receitas + totais.despesas;

  const porAno = itens.reduce<Record<number, typeof itens>>((acc, item) => {
    (acc[item.competenciaAno] ??= []).push(item);
    return acc;
  }, {});
  const anos = Object.keys(porAno)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Transparência financeira"
      descricao="Receitas e despesas do sindicato por competência, a partir dos balancetes publicados."
    >
      {isLoading && <EstadoCarregando mensagem="Carregando transparência…" />}
      {isError && <p className="erro">Não foi possível carregar os dados financeiros.</p>}

      {!isLoading && !isError && itens.length === 0 && (
        <div className="estado-vazio">
          <p>Ainda não há balancetes publicados para consulta.</p>
        </div>
      )}

      {!isLoading && !isError && itens.length > 0 && (
        <div className="tp-portal">
          <section className="bal-resumo" aria-label="Resumo do período disponível">
            <article className="bal-resumo-card">
              <p className="bal-resumo-rotulo">Meses</p>
              <p className="bal-resumo-valor">{itens.length}</p>
            </article>
            <article className="bal-resumo-card">
              <p className="bal-resumo-rotulo">Receitas</p>
              <p className="bal-resumo-valor bal-resumo-valor--receita">
                {formatarMoeda(totais.receitas)}
              </p>
            </article>
            <article className="bal-resumo-card">
              <p className="bal-resumo-rotulo">Despesas</p>
              <p className="bal-resumo-valor bal-resumo-valor--despesa">
                {formatarMoeda(totais.despesas)}
              </p>
            </article>
            <article className="bal-resumo-card bal-resumo-card--resultado">
              <p className="bal-resumo-rotulo">Resultado</p>
              <p
                className={`bal-resumo-valor ${resultado >= 0 ? 'bal-valor-pos' : 'bal-valor-neg'}`}
              >
                {formatarMoeda(resultado)}
              </p>
              {volume > 0 && (
                <div className="bal-barra" aria-hidden="true">
                  <span
                    className="bal-barra-receita"
                    style={{ width: `${percentual(totais.receitas, volume)}%` }}
                  />
                  <span
                    className="bal-barra-despesa"
                    style={{ width: `${percentual(totais.despesas, volume)}%` }}
                  />
                </div>
              )}
            </article>
          </section>

          <p className="tp-aviso">
            São divulgados apenas totais e categorias dos balancetes. Extratos bancários, faturas e
            o plano de contas detalhado permanecem restritos à administração.
          </p>

          {anos.map((ano) => (
            <section key={ano} className="tp-ano" aria-labelledby={`tp-ano-${ano}`}>
              <h2 id={`tp-ano-${ano}`} className="tp-ano-titulo">
                {ano}
              </h2>
              <ul className="tp-lista">
                {(porAno[ano] ?? []).map((item) => (
                  <li key={item.id}>
                    <Link to={`/afiliado/transparencia/${item.id}`} className="tp-mes">
                      <div className="tp-mes-topo">
                        <strong>{nomeCompetencia(item.competenciaMes, item.competenciaAno)}</strong>
                        <span
                          className={
                            item.resultado >= 0 ? 'bal-valor-pos' : 'bal-valor-neg'
                          }
                        >
                          {formatarMoeda(item.resultado)}
                        </span>
                      </div>
                      <div className="tp-mes-valores">
                        <span>
                          Receitas <strong>{formatarMoeda(item.totalReceitas)}</strong>
                        </span>
                        <span>
                          Despesas <strong>{formatarMoeda(item.totalDespesas)}</strong>
                        </span>
                      </div>
                      <div className="bal-barra" aria-hidden="true">
                        <span
                          className="bal-barra-receita"
                          style={{
                            width: `${percentual(item.totalReceitas, item.totalReceitas + item.totalDespesas)}%`,
                          }}
                        />
                        <span
                          className="bal-barra-despesa"
                          style={{
                            width: `${percentual(item.totalDespesas, item.totalReceitas + item.totalDespesas)}%`,
                          }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AreaLayout>
  );
}
