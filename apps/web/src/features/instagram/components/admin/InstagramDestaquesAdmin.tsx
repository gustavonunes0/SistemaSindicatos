import { useDefinirDestaqueInstagram, useInstagramAdmin } from '../../hooks';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../../lib/datas';
import { INSTAGRAM_USUARIO } from '../../constants';

export function InstagramDestaquesAdmin() {
  const { data: posts, isLoading, isError } = useInstagramAdmin();
  const definir = useDefinirDestaqueInstagram();

  return (
    <section className="admin-bloco" aria-labelledby="ig-destaques-titulo">
      <header className="admin-bloco-header">
        <div>
          <h2 id="ig-destaques-titulo">Instagram na home</h2>
          <p>
            Marque posts de @{INSTAGRAM_USUARIO} para aparecerem no carrossel da página inicial
            junto com as notícias em destaque.
          </p>
        </div>
      </header>

      {isLoading && !posts && <EstadoCarregando mensagem="Carregando posts…" />}
      {isError && !posts && (
        <p className="erro">Não foi possível carregar os posts do Instagram.</p>
      )}
      {posts && posts.length === 0 && (
        <p className="estado-vazio-texto">
          Nenhum post sincronizado ainda. Configure a integração do Instagram ou aguarde a próxima
          sincronização.
        </p>
      )}

      {posts && posts.length > 0 && (
        <ul className="ig-admin-grid">
          {posts.map((post) => {
            const pendente = definir.isPending && definir.variables?.id === post.id;
            return (
              <li key={post.id} className={post.destaque ? 'ig-admin-item ig-admin-item--destaque' : 'ig-admin-item'}>
                <a href={post.permalink} target="_blank" rel="noreferrer" className="ig-admin-thumb">
                  <img src={post.mediaUrl} alt="" loading="lazy" />
                </a>
                <div className="ig-admin-meta">
                  <p className="ig-admin-caption">
                    {post.caption?.trim() || 'Sem legenda'}
                  </p>
                  <time dateTime={post.publicadoEm.toISOString()}>
                    {formatarData(post.publicadoEm)}
                  </time>
                  <button
                    type="button"
                    className={
                      post.destaque
                        ? 'botao-tabela botao-tabela--destaque'
                        : 'botao-tabela'
                    }
                    disabled={pendente}
                    onClick={() =>
                      definir.mutate({ id: post.id, destaque: !post.destaque })
                    }
                  >
                    {pendente
                      ? 'Salvando…'
                      : post.destaque
                        ? 'Remover destaque'
                        : 'Destacar na home'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
