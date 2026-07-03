import type { ReactNode } from 'react';
import { Logo } from '../../../components/ui/Logo';

interface AuthLayoutProps {
  titulo: string;
  children: ReactNode;
}

export function AuthLayout({ titulo, children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Logo variante="auth" />
        <h2>{titulo}</h2>
        {children}
      </section>
    </main>
  );
}
