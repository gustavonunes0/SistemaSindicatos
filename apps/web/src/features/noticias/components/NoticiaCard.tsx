import type { Noticia } from '@sindprf/types';
import { Link } from 'react-router-dom';
import { formatarData } from '../../../lib/datas';
import { resumoDeHtml } from '../../../lib/seo';
import { urlDaApi } from '../../../lib/urls';

export function NoticiaCard({ noticia }: { noticia: Noticia }) {
  return (
    <article className="noticia-card">
      {noticia.capaUrl && (
        <Link to={`/noticias/${noticia.slug}`}>
          <img src={urlDaApi(noticia.capaUrl)} alt="" loading="lazy" />
        </Link>
      )}
      <div className="noticia-card-corpo">
        {noticia.publicadoEm && <time>{formatarData(noticia.publicadoEm)}</time>}
        <h3>
          <Link to={`/noticias/${noticia.slug}`}>{noticia.titulo}</Link>
        </h3>
        <p>{resumoDeHtml(noticia.conteudo, 120)}</p>
      </div>
    </article>
  );
}
