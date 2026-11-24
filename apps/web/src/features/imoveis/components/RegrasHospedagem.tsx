import {
  REGRAS_HOSPEDAGEM,
  REGRAS_RESERVA_RESUMO,
  type PerfilHospedagem,
} from '@sindprf/types';
import { useMarca } from '../../../lib/marca';

type RegrasHospedagemProps = {
  /** Quando informado, exibe só os valores desse perfil. */
  perfil?: PerfilHospedagem;
  compacta?: boolean;
};

export function RegrasHospedagem({ perfil, compacta = false }: RegrasHospedagemProps) {
  const marca = useMarca();
  const regras = perfil ? REGRAS_HOSPEDAGEM[perfil] : null;

  return (
    <section
      className={`imovel-regras${compacta ? ' imovel-regras--compacta' : ''}`}
      aria-labelledby="imovel-regras-titulo"
    >
      <header className="imovel-regras-cabecalho">
        <div>
          <p className="eyebrow">Regulamento</p>
          <h2 id="imovel-regras-titulo">{regras ? regras.titulo : 'Prazos e valores'}</h2>
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

      {regras && (
        <article className="imovel-regras-card imovel-regras-card--destaque imovel-regras-card--unico">
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
      )}

      {!regras && (
        <p className="imovel-regras-aviso">
          Os valores e prazos dependem do seu perfil (filiado SINDPRF-CE, filiado de outro estado ou
          PRF não filiado). Eles aparecem ao escolher o perfil no pedido.
        </p>
      )}

      <ul className="imovel-regras-resumo">
        {REGRAS_RESERVA_RESUMO.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
