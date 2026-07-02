import type { ReactNode } from 'react';

interface AuthLayoutProps {
  titulo: string;
  children: ReactNode;
}

export function AuthLayout({ titulo, children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Sindicato PRF</h1>
        <h2>{titulo}</h2>
        {children}
      </section>
    </main>
  );
}
