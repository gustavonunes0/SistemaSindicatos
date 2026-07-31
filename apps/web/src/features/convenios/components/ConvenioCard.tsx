import type { Convenio } from '@sindprf/types';
import { Link } from 'react-router-dom';
import { urlDaApi } from '../../../lib/urls';

export function ConvenioCard({ convenio }: { convenio: Convenio }) {
  return (
    <Link to={`/afiliado/convenios/${convenio.id}`} className="convenio-card">
      <div className="convenio-card-logo" aria-hidden={!convenio.logoUrl}>
        {convenio.logoUrl ? (
          <img src={urlDaApi(convenio.logoUrl)} alt="" loading="lazy" />
        ) : (
          <span>{convenio.nome.charAt(0)}</span>
        )}
      </div>
      <div className="convenio-card-corpo">
        <span className="convenio-categoria">{convenio.categoria}</span>
        <h3>{convenio.nome}</h3>
        <p>{convenio.descricao}</p>
        {convenio.emiteDeclaracao && (
          <span className="convenio-card-declaracao">Emite declaração</span>
        )}
      </div>
    </Link>
  );
}
