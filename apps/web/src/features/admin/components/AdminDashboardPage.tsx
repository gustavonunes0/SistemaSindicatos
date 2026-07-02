import { Link } from 'react-router-dom';
import { useLogout, useMe } from '../../auth/hooks';

export function AdminDashboardPage() {
  const { data, isLoading, isError } = useMe();
  const logout = useLogout();

  return (
    <main className="area-page">
      <header className="area-header">
        <h1>Área administrativa</h1>
        <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending}>
          Sair
        </button>
      </header>

      {isLoading && <p>Carregando…</p>}
      {isError && <p className="erro">Erro ao carregar seus dados.</p>}
      {data && <p>Bem-vindo, {data.user.email}.</p>}

      <nav className="admin-menu">
        <Link to="/admin/noticias" className="admin-menu-item">
          <h3>Notícias</h3>
          <p>Criar, editar e publicar notícias do site.</p>
        </Link>
        <Link to="/" className="admin-menu-item">
          <h3>Site público</h3>
          <p>Ver o site como os visitantes.</p>
        </Link>
      </nav>
    </main>
  );
}
