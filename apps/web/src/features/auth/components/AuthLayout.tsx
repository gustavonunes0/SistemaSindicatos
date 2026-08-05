import type { ReactNode } from 'react';
import { Logo } from '../../../components/ui/Logo';
import { useMarca } from '../../../lib/marca';

interface AuthLayoutProps {
  titulo: string;
  children: ReactNode;
}

export function AuthLayout({ titulo, children }: AuthLayoutProps) {
  const marca = useMarca();

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Logo variante="auth" />
        <p className="auth-marca">{marca.nome}</p>
        <h2>{titulo}</h2>
        {children}
      </section>
    </main>
  );
}
