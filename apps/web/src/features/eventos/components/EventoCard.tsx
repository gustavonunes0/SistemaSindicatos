import type { Evento } from '@sindprf/types';
import { Link } from 'react-router-dom';
import { urlDaApi } from '../../../lib/urls';
import { formatarDataEvento } from '../formatarDataEvento';

type EventoCardProps = {
  evento: Evento;
};

export function EventoCard({ evento }: EventoCardProps) {
  const capa = evento.fotos?.[0];
  const totalFotos = evento.fotos?.length ?? 0;

  return (
    <Link to={`/afiliado/eventos/${evento.id}`} className="evento-card">
      <div className="evento-card-capa">
        {capa ? (
          <img src={urlDaApi(capa.url)} alt="" loading="lazy" />
        ) : (
          <span className="evento-card-capa-vazia">Sem fotos</span>
        )}
        {totalFotos > 0 && (
          <span className="evento-card-qtd">
            {totalFotos} {totalFotos === 1 ? 'foto' : 'fotos'}
          </span>
        )}
      </div>
      <div className="evento-card-corpo">
        <h2>{evento.titulo}</h2>
        {evento.dataEvento && (
          <p className="texto-secundario">{formatarDataEvento(evento.dataEvento)}</p>
        )}
        {evento.local && <p className="texto-secundario">{evento.local}</p>}
      </div>
    </Link>
  );
}
