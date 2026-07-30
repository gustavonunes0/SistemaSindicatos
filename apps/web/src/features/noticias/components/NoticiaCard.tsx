import type { Noticia } from '@sindprf/types';
import { Link } from 'react-router-dom';
import { formatarData } from '../../../lib/datas';
import { marca } from '../../../lib/marca';
import { resumoDeHtml } from '../../../lib/seo';
import { urlDaApi } from '../../../lib/urls';

type NoticiaCardProps = {
  noticia: Noticia;
  destaque?: boolean;
};

export function NoticiaCard({ noticia, destaque = false }: NoticiaCardProps) {
  const resumo = resumoDeHtml(noticia.conteudo, destaque ? 180 : 120);

  return (
    <article className={`noticia-card${destaque ? ' noticia-card--destaque' : ''}`}>
      <Link to={`/noticias/${noticia.slug}`} className="noticia-card-media">
        {noticia.capaUrl ? (
          <img src={urlDaApi(noticia.capaUrl)} alt="" loading="lazy" />
        ) : (
          <span className="noticia-card-placeholder" aria-hidden="true">
            <span className="noticia-card-placeholder-faixa" />
            {marca.nome}
          </span>
        )}
      </Link>

      <div className="noticia-card-corpo">
        {noticia.publicadoEm && (
          <time dateTime={noticia.publicadoEm.toISOString()}>
            {formatarData(noticia.publicadoEm)}
          </time>
        )}
        <h3>
          <Link to={`/noticias/${noticia.slug}`}>{noticia.titulo}</Link>
        </h3>
        {resumo && <p>{resumo}</p>}
        <Link to={`/noticias/${noticia.slug}`} className="noticia-card-ler">
          Ler notícia <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
