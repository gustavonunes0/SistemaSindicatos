import { Link } from 'react-router-dom';
import { useNoticias } from '../features/noticias/hooks';
import { NoticiaCard } from '../features/noticias/components/NoticiaCard';
import { useSeo } from '../lib/seo';

export function HomePage() {
  useSeo({
    title: 'Sindicato PRF',
    description: 'Sindicato dos Policiais Rodoviários Federais — notícias, convênios e serviços.',
  });
  const { data, isLoading, isError } = useNoticias(1, 3);

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <h1>Defendendo quem protege as rodovias</h1>
          <p>
            Representação, benefícios e serviços para os Policiais Rodoviários Federais e suas
            famílias.
          </p>
          <div className="hero-acoes">
            <Link to="/login" className="botao-primario">
              Área do afiliado
            </Link>
            <Link to="/sobre" className="botao-secundario">
              Conheça o sindicato
            </Link>
          </div>
        </div>
      </section>

      <section className="secao">
        <div className="secao-inner">
          <header className="secao-header">
            <h2>Últimas notícias</h2>
            <Link to="/noticias">Ver todas</Link>
          </header>

          {isLoading && <p>Carregando notícias…</p>}
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
    </main>
  );
}
