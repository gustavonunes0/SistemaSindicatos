import { Link, useParams } from 'react-router-dom';
import { formatarData } from '../../../lib/datas';
import { resumoDeHtml, useSeo } from '../../../lib/seo';
import { urlDaApi } from '../../../lib/urls';
import { useNoticia } from '../hooks';

export function NoticiaDetalhePage() {
  const { slug = '' } = useParams();
  const { data: noticia, isLoading, isError } = useNoticia(slug);

  useSeo({
    title: noticia ? `${noticia.titulo} — Sindicato PRF` : 'Notícia — Sindicato PRF',
    description: noticia ? resumoDeHtml(noticia.conteudo) : undefined,
    image: noticia?.capaUrl ? urlDaApi(noticia.capaUrl) : undefined,
  });

  if (isLoading) {
    return (
      <main className="secao">
        <div className="secao-inner">
          <p>Carregando notícia…</p>
        </div>
      </main>
    );
  }

  if (isError || !noticia) {
    return (
      <main className="secao">
        <div className="secao-inner">
          <h1>Notícia não encontrada</h1>
          <p>
            <Link to="/noticias">← Voltar para as notícias</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="secao">
      <article className="secao-inner noticia-detalhe">
        <Link to="/noticias">← Todas as notícias</Link>
        <h1>{noticia.titulo}</h1>
        {noticia.publicadoEm && <time>{formatarData(noticia.publicadoEm)}</time>}
        {noticia.capaUrl && (
          <img className="noticia-capa" src={urlDaApi(noticia.capaUrl)} alt="" />
        )}
        {/* Conteúdo produzido pelo editor do admin (fonte confiável). */}
        <div className="conteudo-texto" dangerouslySetInnerHTML={{ __html: noticia.conteudo }} />
      </article>
    </main>
  );
}
