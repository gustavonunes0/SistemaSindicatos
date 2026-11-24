import {
  REGRAS_HOSPEDAGEM,
  REGRAS_RESERVA_RESUMO,
  type PerfilHospedagem,
} from '@sindprf/types';
import { useMarca } from '../../../lib/marca';

const ORDEM: PerfilHospedagem[] = ['FILIADO_SINDPRF', 'FILIADO_OUTRO', 'NAO_FILIADO'];

type RegrasHospedagemProps = {
  /** Destaca o perfil do filiado logado (SINDPRF). */
  perfilDestaque?: PerfilHospedagem;
  compacta?: boolean;
};

export function RegrasHospedagem({
  perfilDestaque = 'FILIADO_SINDPRF',
  compacta = false,
}: RegrasHospedagemProps) {
  const marca = useMarca();

  return (
    <section
      className={`imovel-regras${compacta ? ' imovel-regras--compacta' : ''}`}
      aria-labelledby="imovel-regras-titulo"
    >
      <header className="imovel-regras-cabecalho">
        <div>
          <p className="eyebrow">Regulamento</p>
          <h2 id="imovel-regras-titulo">Prazos e valores</h2>
        </div>
        {marca.regulamentoApartamentosUrl && (
          <a
            className="botao-secundario"
            href={marca.regulamentoApartamentosUrl}
            target="_blank"
            rel="noreferrer"
          >
            PDF completo
            <span aria-hidden="true"> ↗</span>
          </a>
        )}
      </header>

      <div className="imovel-regras-tabelas">
        {ORDEM.map((perfil) => {
          const regras = REGRAS_HOSPEDAGEM[perfil];
          const destaque = perfil === perfilDestaque;
          return (
            <article
              key={perfil}
              className={`imovel-regras-card${destaque ? ' imovel-regras-card--destaque' : ''}`}
            >
              <h3>{regras.titulo}</h3>
              <ul className="imovel-regras-faixas">
                {regras.faixas.map((faixa) => (
                  <li key={faixa.rotulo}>{faixa.rotulo}</li>
                ))}
              </ul>
              <dl className="imovel-regras-limites">
                <div>
                  <dt>Máximo contínuo</dt>
                  <dd>{regras.maxContinuoDias} dias</dd>
                </div>
                <div>
                  <dt>Intervalo mínimo</dt>
                  <dd>{regras.intervaloMinimoDias} dias</dd>
                </div>
                <div>
                  <dt>Limite anual</dt>
                  <dd>{regras.limiteAnualDias} dias</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <ul className="imovel-regras-resumo">
        {REGRAS_RESERVA_RESUMO.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
