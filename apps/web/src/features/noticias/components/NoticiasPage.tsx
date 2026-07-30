import { useState } from 'react';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { BotaoAlertasNoticia } from '../../pwa/components/BotaoAlertasNoticia';
import { marca } from '../../../lib/marca';
import { useSeo } from '../../../lib/seo';
import { useNoticias } from '../hooks';
import { NoticiaCard } from './NoticiaCard';

export function NoticiasPage() {
  useSeo({
    title: `Notícias — ${marca.nome}`,
    description: `Acompanhe as últimas notícias do ${marca.nome}.`,
  });
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useNoticias(page);

  const destaque = page === 1 ? data?.items[0] : undefined;
  const demais = page === 1 && data ? data.items.slice(1) : data?.items ?? [];

  return (
    <main className="noticias-page">
      <section className="noticias-hero" aria-labelledby="noticias-titulo">
        <div className="noticias-hero-inner">
          <p className="eyebrow noticias-hero-eyebrow">Comunicação</p>
          <h1 id="noticias-titulo">Notícias</h1>
          <span className="noticias-faixa" aria-hidden="true" />
          <p className="noticias-hero-texto">
            Acompanhe os comunicados e a cobertura do {marca.nome} para a categoria no Ceará.
          </p>
        </div>
      </section>

      <div className="noticias-corpo secao-inner">
        <BotaoAlertasNoticia />

        {isLoading && <EstadoCarregando mensagem="Carregando notícias…" />}
        {isError && (
          <p className="erro noticias-estado">Não foi possível carregar as notícias.</p>
        )}
        {data && data.items.length === 0 && (
          <p className="noticias-estado">Nenhuma notícia publicada ainda.</p>
        )}

        {data && data.items.length > 0 && (
          <>
            {destaque && (
              <section className="noticias-destaque" aria-label="Destaque">
                <NoticiaCard noticia={destaque} destaque />
              </section>
            )}

            {demais.length > 0 && (
              <section className="noticias-lista" aria-label="Lista de notícias">
                <div className="noticias-grid">
                  {demais.map((noticia) => (
                    <NoticiaCard key={noticia.id} noticia={noticia} />
                  ))}
                </div>
              </section>
            )}

            {data.totalPages > 1 && (
              <nav className="paginacao" aria-label="Paginação">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((atual) => atual - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ← Anterior
                </button>
                <span>
                  Página {data.page} de {data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => {
                    setPage((atual) => atual + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Próxima →
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
