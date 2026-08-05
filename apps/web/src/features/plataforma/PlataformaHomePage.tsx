import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { RequireRole } from '../auth/components/guards';
import { useLogout } from '../auth/hooks';
import { useAuthStore } from '../auth/store';
import { api } from '../../lib/http';
import { useMarca } from '../../lib/marca';
import { useSeo } from '../../lib/seo';

type TenantLista = {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
  domains: { host: string; primario: boolean }[];
  _count: { users: number; afiliados: number };
};

function protegidaPlataforma(element: ReactNode) {
  return <RequireRole role="SUPERADMIN">{element}</RequireRole>;
}

export function PlataformaHomePage() {
  const marca = useMarca();
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);

  useSeo({
    title: `${marca.nome} — plataforma`,
    description: marca.nomeCompleto,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['plataforma', 'tenants'],
    queryFn: async () => {
      const { data: body } = await api.get<TenantLista[]>('/plataforma/tenants');
      return body;
    },
  });

  return (
    <div className="min-h-svh bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">Plataforma</p>
          <h1 className="text-xl font-semibold">{marca.nome}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[var(--color-ink-muted)]">{user?.email}</span>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="mb-2 text-2xl font-semibold">Sindicatos (clientes)</h2>
        <p className="mb-8 text-sm text-[var(--color-ink-muted)]">
          Painel Stellar — gestão multi-tenant. O site público de cada cliente fica no domínio próprio.
        </p>

        {isLoading && <p>Carregando…</p>}
        {error && <p className="text-red-700">Falha ao listar tenants.</p>}

        <ul className="space-y-4">
          {(data ?? []).map((t) => (
            <li
              key={t.id}
              className="border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-medium">{t.nome}</h3>
                <span className="text-xs uppercase text-[var(--color-ink-muted)]">
                  {t.ativo ? 'ativo' : 'inativo'} · {t.slug}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                {t._count.afiliados} afiliados · {t._count.users} usuários
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {t.domains.map((d) => (
                  <li key={d.host}>
                    <a
                      className="text-[var(--color-accent)] underline-offset-2 hover:underline"
                      href={`https://${d.host}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d.host}
                      {d.primario ? ' (primário)' : ''}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {(data?.length ?? 0) === 0 && !isLoading && (
          <p className="text-sm text-[var(--color-ink-muted)]">Nenhum sindicato cadastrado.</p>
        )}
      </main>
    </div>
  );
}

export function PlataformaGate() {
  return protegidaPlataforma(<PlataformaHomePage />);
}

export function PlataformaLoginRedirect() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  if (token && user?.role === 'SUPERADMIN') {
    return <Navigate to="/plataforma" replace />;
  }
  if (token && user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h2>Área da plataforma</h2>
          <p>Este domínio é exclusivo da Stellar (SUPERADMIN).</p>
          <Link to="/login">Entrar com outra conta</Link>
        </section>
      </main>
    );
  }
  return <Navigate to="/login" replace />;
}
