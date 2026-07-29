import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useImportacoesBalancete } from '../../../balancetes/hooks';
import { useImportacoesD8 } from '../../../d8/hooks';
import { FinanceiroSubnav } from './FinanceiroSubnav';

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FinanceiroHubPage() {
  const balancetes = useImportacoesBalancete();
  const d8 = useImportacoesD8();

  const carregando = balancetes.isLoading || d8.isLoading;
  const erro = balancetes.isError || d8.isError;

  const listaBal = balancetes.data ?? [];
  const listaD8 = d8.data ?? [];

  const totaisBal = listaBal.reduce(
    (acc, item) => {
      acc.receitas += item.totalReceitas;
      acc.despesas += item.totalDespesas;
      return acc;
    },
    { receitas: 0, despesas: 0 },
  );

  const totalD8 = listaD8.reduce((acc, item) => acc + item.totalValor, 0);
  const competenciasD8 = new Set(
    listaD8.map((item) => `${item.competenciaAno}-${item.competenciaMes}`),
  ).size;

  return (
    <AreaLayout
      tipo="admin"
      titulo="Financeiro"
      descricao="Balancetes contábeis e importação D8 (SIAPE) em um só lugar."
    >
      <FinanceiroSubnav />

      {carregando && <EstadoCarregando mensagem="Carregando resumo financeiro…" />}
      {erro && <p className="erro">Não foi possível carregar o resumo financeiro.</p>}

      {!carregando && !erro && (
        <>
          <section className="fin-resumo" aria-label="Resumo financeiro">
            <article className="bal-resumo-card">
              <p className="bal-resumo-rotulo">Meses (balancete)</p>
              <p className="bal-resumo-valor">{listaBal.length}</p>
            </article>
            <article className="bal-resumo-card">
              <p className="bal-resumo-rotulo">Receitas importadas</p>
              <p className="bal-resumo-valor bal-resumo-valor--receita">
                {formatarMoeda(totaisBal.receitas)}
              </p>
            </article>
            <article className="bal-resumo-card">
              <p className="bal-resumo-rotulo">Despesas importadas</p>
              <p className="bal-resumo-valor bal-resumo-valor--despesa">
                {formatarMoeda(totaisBal.despesas)}
              </p>
            </article>
            <article className="bal-resumo-card bal-resumo-card--resultado">
              <p className="bal-resumo-rotulo">Arrecadação D8</p>
              <p className="bal-resumo-valor">{formatarMoeda(totalD8)}</p>
              <p className="bal-resumo-detalhe">
                {competenciasD8} {competenciasD8 === 1 ? 'competência' : 'competências'} SIAPE
              </p>
            </article>
          </section>

          <section className="fin-modulos" aria-label="Áreas do financeiro">
            <Link to="/admin/financeiro/balancetes" className="fin-modulo fin-modulo--destaque">
              <p className="eyebrow">Contabilidade</p>
              <h2 className="fin-modulo-titulo">Balancetes</h2>
              <p className="fin-modulo-desc">
                Importe o PDF Fortes e acompanhe receitas e despesas por mês e categoria.
              </p>
              <dl className="fin-modulo-meta">
                <div>
                  <dt>Importados</dt>
                  <dd>{listaBal.length} meses</dd>
                </div>
                <div>
                  <dt>Resultado</dt>
                  <dd>{formatarMoeda(totaisBal.receitas - totaisBal.despesas)}</dd>
                </div>
              </dl>
              <span className="fin-modulo-acao">Abrir balancetes</span>
            </Link>

            <Link to="/admin/financeiro/d8" className="fin-modulo">
              <p className="eyebrow">SIAPE</p>
              <h2 className="fin-modulo-titulo">Importação D8</h2>
              <p className="fin-modulo-desc">
                Importe o extrato de mensalidade, analise a arrecadação e sincronize afiliados.
              </p>
              <dl className="fin-modulo-meta">
                <div>
                  <dt>Arquivos</dt>
                  <dd>{listaD8.length}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{formatarMoeda(totalD8)}</dd>
                </div>
              </dl>
              <span className="fin-modulo-acao">Abrir D8</span>
            </Link>
          </section>
        </>
      )}
    </AreaLayout>
  );
}
