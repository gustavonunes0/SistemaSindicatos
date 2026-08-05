import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLogout } from '../auth/hooks';
import { useAuthStore } from '../auth/store';
import { useMarca } from '../../lib/marca';

const STELLAR_WORDMARK = '/marca/stellar-logo-dark.png';

type PlataformaLayoutProps = {
  children: ReactNode;
  titulo: string;
  descricao?: string;
};

export function PlataformaLayout({ children, titulo, descricao }: PlataformaLayoutProps) {
  const marca = useMarca();
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="sg-shell">
      <aside className="sg-sidebar" aria-label="Navegação da plataforma">
        <div className="sg-sidebar-brand">
          <img src={STELLAR_WORDMARK} alt="Stellar" width={140} height={20} decoding="async" />
          <p className="sg-sidebar-produto">{marca.nome}</p>
        </div>

        <nav className="sg-nav">
          <NavLink to="/plataforma" end className={({ isActive }) => (isActive ? 'sg-nav-link is-active' : 'sg-nav-link')}>
            Visão geral
          </NavLink>
        </nav>

        <div className="sg-sidebar-foot">
          <p className="sg-sidebar-foot-label">Operação Stellar</p>
          <a href="https://www.stellarsolucoes.com.br/" target="_blank" rel="noreferrer">
            stellarsolucoes.com.br
          </a>
        </div>
      </aside>

      <div className="sg-main">
        <header className="sg-topbar">
          <div className="sg-topbar-copy">
            <p className="sg-eyebrow">Plataforma</p>
            <h1>{titulo}</h1>
            {descricao ? <p className="sg-topbar-desc">{descricao}</p> : null}
          </div>
          <div className="sg-topbar-user">
            <div className="sg-user-meta">
              <span className="sg-user-role">SUPERADMIN</span>
              <span className="sg-user-email">{user?.email}</span>
            </div>
            <button
              type="button"
              className="sg-btn-ghost"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              Sair
            </button>
          </div>
        </header>

        <div className="sg-content">{children}</div>
      </div>
    </div>
  );
}
