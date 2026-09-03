import { useInstagramFeed } from '../hooks';
import { INSTAGRAM_PERFIL_URL, INSTAGRAM_USUARIO } from '../constants';

// Fallback silencioso: se a API falhar ou o feed estiver vazio,
// a seção simplesmente não aparece — a Home nunca quebra.
export function InstagramGrid() {
  const { data: posts, isError, isLoading } = useInstagramFeed();

  if (isLoading || isError || !posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="secao secao-instagram">
      <div className="secao-inner">
        <header className="secao-header">
          <div>
            <span className="eyebrow">Redes</span>
            <h2>No Instagram</h2>
          </div>
          <a href={INSTAGRAM_PERFIL_URL} target="_blank" rel="noreferrer">
            Seguir @{INSTAGRAM_USUARIO}
          </a>
        </header>

        <div className="instagram-grid">
          {posts.slice(0, 6).map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
              className="instagram-item"
              title={post.caption ?? 'Ver no Instagram'}
            >
              <img src={post.mediaUrl} alt={post.caption ?? 'Post do Instagram'} loading="lazy" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
