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
      {data && <p>Bem-vindo, {data.user.email}. Gestão de afiliados chega na próxima fase.</p>}
    </main>
  );
}
