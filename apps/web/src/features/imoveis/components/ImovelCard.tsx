import type { Imovel } from '@sindprf/types';
import { Link } from 'react-router-dom';
import { formatarMoeda } from '../../../lib/moeda';
import { urlDaApi } from '../../../lib/urls';

const COMODIDADES_VISIVEIS = 3;

export function ImovelCard({ imovel }: { imovel: Imovel }) {
  const fotos = imovel.fotos ?? [];
  const capa = fotos[0];
  const extras = imovel.comodidades.length - COMODIDADES_VISIVEIS;

  return (
    <Link to={`/afiliado/imoveis/${imovel.id}`} className="imovel-card">
      <div className="imovel-card-foto">
        {capa ? (
          <img src={urlDaApi(capa.url)} alt="" loading="lazy" />
        ) : (
          <span className="imovel-card-sem-foto">Fotos em breve</span>
        )}
        <div className="imovel-card-foto-meta">
          {fotos.length > 0 && (
            <span className="imovel-card-contador">
              {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
            </span>
          )}
        </div>
      </div>

      <div className="imovel-card-corpo">
        <h3>{imovel.titulo}</h3>
        <p className="imovel-card-endereco">{imovel.endereco}</p>

        <p className="imovel-card-valor">
          {formatarMoeda(imovel.valor)}
          <span> / dia</span>
        </p>

        {imovel.comodidades.length > 0 && (
          <ul className="imovel-card-comodidades">
            {imovel.comodidades.slice(0, COMODIDADES_VISIVEIS).map((item) => (
              <li key={item}>{item}</li>
            ))}
            {extras > 0 && <li className="imovel-comodidade-extra">+{extras}</li>}
          </ul>
        )}

        <span className="imovel-card-acao">
          Ver datas e detalhes
          <span aria-hidden="true"> →</span>
        </span>
      </div>
    </Link>
  );
}
