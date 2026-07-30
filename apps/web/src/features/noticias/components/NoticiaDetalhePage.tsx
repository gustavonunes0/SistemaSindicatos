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
      <main className="noticia-detalhe-page">
        <div className="secao-inner noticia-detalhe-estado">
          <EstadoCarregando mensagem="Carregando notícia…" />
        </div>
      </main>
    );
  }

  if (isError || !noticia) {
    return (
      <main className="noticia-detalhe-page">
        <div className="secao-inner noticia-detalhe-estado">
          <p className="eyebrow">Comunicação</p>
          <h1>Notícia não encontrada</h1>
          <p>O endereço pode estar incorreto ou a publicação foi removida.</p>
          <Link to="/noticias" className="botao-secundario">
            Voltar para as notícias
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="noticia-detalhe-page">
      <article>
        <header className="noticia-detalhe-hero">
          <div className="noticia-detalhe-hero-inner">
            <Link to="/noticias" className="noticia-detalhe-voltar">
              ← Todas as notícias
            </Link>
            <p className="eyebrow noticia-detalhe-eyebrow">Comunicação</p>
            <h1>{noticia.titulo}</h1>
            <span className="noticia-detalhe-faixa" aria-hidden="true" />
            {noticia.publicadoEm && (
              <time dateTime={noticia.publicadoEm.toISOString()}>
                {formatarData(noticia.publicadoEm)}
              </time>
            )}
          </div>
        </header>

        <div className="secao-inner noticia-detalhe-corpo">
          {noticia.capaUrl && (
            <figure className="noticia-capa-wrap">
              <img
                className="noticia-capa"
                src={urlDaApi(noticia.capaUrl)}
                alt=""
              />
            </figure>
          )}

          <div
            className="noticia-prose"
            dangerouslySetInnerHTML={{ __html: noticia.conteudo }}
          />

          <footer className="noticia-detalhe-rodape">
            <p>Publicado pelo {marca.nome}</p>
            <Link to="/noticias" className="botao-secundario">
              Ver todas as notícias
            </Link>
          </footer>
        </div>
      </article>
    </main>
  );
}
