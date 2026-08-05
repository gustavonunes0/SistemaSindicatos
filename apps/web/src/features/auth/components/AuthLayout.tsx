import type { ReactNode } from 'react';
import { useTenantStore } from '../../tenant/store';
import { useMarca } from '../../../lib/marca';
import { Logo } from '../../../components/ui/Logo';

interface AuthLayoutProps {
  titulo: string;
  children: ReactNode;
}

const STELLAR_LOGO = '/marca/stellar-logo-dark.png';

export function AuthLayout({ titulo, children }: AuthLayoutProps) {
  const tipo = useTenantStore((s) => s.tenant?.tipo);
  const marca = useMarca();
  const ehPlataforma = tipo === 'PLATAFORMA';

  if (ehPlataforma) {
    return (
      <main className="auth-page auth-page--stellar">
        <div className="auth-stellar-fundo" aria-hidden="true" />
        <section className="auth-card auth-card--stellar">
          <header className="auth-stellar-cabecalho">
            <img
              src={STELLAR_LOGO}
              alt="Stellar"
              className="auth-stellar-wordmark"
              width={200}
              height={29}
              decoding="async"
            />
            <p className="auth-stellar-produto">{marca.nome}</p>
            <h2>{titulo}</h2>
            <p className="auth-stellar-sub">{marca.nomeCompleto}</p>
          </header>
          {children}
          <footer className="auth-stellar-rodape">
            <a href="https://www.stellarsolucoes.com.br/" target="_blank" rel="noreferrer">
              stellarsolucoes.com.br
            </a>
          </footer>
        </section>
      </main>
    );
  }

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
