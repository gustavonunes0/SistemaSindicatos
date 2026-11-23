import type { Role } from '@sindprf/types';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { areaPorRole } from '../hooks';
import { useAuthStore } from '../store';

interface RequireRoleProps {
  /** Uma role exata. Ignorado se `roles` for informado. */
  role?: Role;
  /** Qualquer uma destas roles libera o acesso. */
  roles?: Role[];
  children: ReactNode;
}

// Não autenticado → login. Autenticado com role errada → 403.
export function RequireRole({ role, roles, children }: RequireRoleProps) {
  const { accessToken, user } = useAuthStore();
  const permitidas = roles ?? (role ? [role] : []);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  if (permitidas.length > 0 && !permitidas.includes(user.role)) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h2>403 — Acesso negado</h2>
          <p>Você não tem permissão para acessar esta área.</p>
          <Link to={areaPorRole(user.role)}>Ir para a minha área</Link>
        </section>
      </main>
    );
  }
  return children;
}

export function RedirectHome() {
  const { accessToken, user } = useAuthStore();
  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={areaPorRole(user.role)} replace />;
}
