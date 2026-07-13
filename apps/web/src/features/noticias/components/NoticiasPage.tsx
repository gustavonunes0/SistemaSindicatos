import { useState } from 'react';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
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

  return (
    <main className="secao">
      <div className="secao-inner">
        <span className="eyebrow">Comunicação</span>
        <h1>Notícias</h1>

        {isLoading && <EstadoCarregando mensagem="Carregando notícias…" />}
        {isError && <p className="erro">Não foi possível carregar as notícias.</p>}
        {data && data.items.length === 0 && <p>Nenhuma notícia publicada ainda.</p>}

        {data && data.items.length > 0 && (
          <>
            <div className="noticias-grid">
              {data.items.map((noticia) => (
                <NoticiaCard key={noticia.id} noticia={noticia} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <nav className="paginacao" aria-label="Paginação">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((atual) => atual - 1)}
                >
                  ← Anterior
                </button>
                <span>
                  Página {data.page} de {data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((atual) => atual + 1)}
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
