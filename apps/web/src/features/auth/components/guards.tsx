import type { Role } from '@sindprf/types';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { areaPorRole } from '../hooks';
import { useAuthStore } from '../store';

interface RequireRoleProps {
  role: Role;
  children: ReactNode;
}

// Não autenticado → login. Autenticado com role errada → 403.
export function RequireRole({ role, children }: RequireRoleProps) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
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
