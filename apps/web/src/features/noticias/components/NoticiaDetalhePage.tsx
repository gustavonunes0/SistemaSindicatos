import { Link, useParams } from 'react-router-dom';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../lib/datas';
import { marca } from '../../../lib/marca';
import { resumoDeHtml, useSeo } from '../../../lib/seo';
import { urlDaApi } from '../../../lib/urls';
import { useNoticia } from '../hooks';

export function NoticiaDetalhePage() {
  const { slug = '' } = useParams();
  const { data: noticia, isLoading, isError } = useNoticia(slug);

  useSeo({
    title: noticia ? `${noticia.titulo} — ${marca.nome}` : `Notícia — ${marca.nome}`,
    description: noticia ? resumoDeHtml(noticia.conteudo) : undefined,
    image: noticia?.capaUrl ? urlDaApi(noticia.capaUrl) : undefined,
  });

  if (isLoading) {
    return (
      <main className="secao">
        <div className="secao-inner">
          <EstadoCarregando mensagem="Carregando notícia…" />
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
        <Link to="/noticias" className="link-voltar">
          ← Todas as notícias
        </Link>
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
