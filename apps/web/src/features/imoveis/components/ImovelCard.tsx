import type { Imovel } from '@sindprf/types';
import { Link } from 'react-router-dom';
import { formatarMoeda } from '../../../lib/moeda';
import { urlDaApi } from '../../../lib/urls';

export function ImovelCard({ imovel }: { imovel: Imovel }) {
  const capa = imovel.fotos?.[0];

  return (
    <Link to={`/afiliado/imoveis/${imovel.id}`} className="imovel-card">
      <div className="imovel-card-foto">
        {capa ? (
          <img src={urlDaApi(capa.url)} alt="" loading="lazy" />
        ) : (
          <span className="imovel-card-sem-foto">Sem foto</span>
        )}
      </div>
      <div className="imovel-card-corpo">
        <h3>{imovel.titulo}</h3>
        <p className="imovel-card-endereco">{imovel.endereco}</p>
        <p className="imovel-card-valor">{formatarMoeda(imovel.valor)}</p>
        {imovel.comodidades.length > 0 && (
          <ul className="imovel-card-comodidades">
            {imovel.comodidades.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
