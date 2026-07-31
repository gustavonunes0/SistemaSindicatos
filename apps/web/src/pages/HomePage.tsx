import { Link } from 'react-router-dom';
import { EstadoCarregando } from '../components/ui/EstadoCarregando';
import { InstagramGrid } from '../features/instagram/components/InstagramGrid';
import { useNoticias } from '../features/noticias/hooks';
import { NoticiaCard } from '../features/noticias/components/NoticiaCard';
import { marca } from '../lib/marca';
import { useSeo } from '../lib/seo';

export function HomePage() {
  useSeo({
    title: marca.nome,
    description: `${marca.nomeCompleto} — notícias, convênios e serviços.`,
  });
  const { data, isLoading, isError } = useNoticias(1, 3);

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-conteudo">
            <p className="hero-eyebrow">{marca.nomeCompleto}</p>
            <h1>Defendendo quem protege as rodovias</h1>
            <span className="hero-faixa" aria-hidden="true" />
            <p className="hero-texto">
              Representação, benefícios e serviços para os Policiais Rodoviários Federais e suas
              famílias.
            </p>
            <div className="hero-acoes">
              <Link to="/login" className="botao-primario">
                Área do afiliado
              </Link>
              <Link to="/cadastro" className="hero-link">
                Como me afiliar <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <aside className="hero-quadro" aria-label="Informações do sindicato">
            <p className="hero-quadro-ano">Desde 1992</p>
            <p className="hero-quadro-regiao">Polícia Rodoviária Federal · Ceará</p>
            <dl>
              <div>
                <dt>Representação</dt>
                <dd>Estados do Ceará</dd>
              </div>
              <div>
                <dt>Sede</dt>
                <dd>Fortaleza · CE</dd>
              </div>
              <div>
                <dt>Atendimento</dt>
                <dd>Seg. a sex., 8h–17h</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="secao">
        <div className="secao-inner">
          <header className="secao-header">
            <div>
              <span className="eyebrow">Comunicação</span>
              <h2>Últimas notícias</h2>
            </div>
            <Link to="/noticias">Ver todas</Link>
          </header>

          {isLoading && <EstadoCarregando mensagem="Carregando notícias…" />}
          {isError && <p className="erro">Não foi possível carregar as notícias.</p>}
          {data && data.items.length === 0 && <p>Nenhuma notícia publicada ainda.</p>}
          {data && data.items.length > 0 && (
            <div className="noticias-grid">
              {data.items.map((noticia) => (
                <NoticiaCard key={noticia.id} noticia={noticia} />
              ))}
            </div>
          )}
        </div>
      </section>

      <InstagramGrid />
    </main>
  );
}
