import { useEffect, type ReactNode } from 'react';
import { aplicarBrandingNoDocumento, resolverMarca } from '../../lib/marca';
import { useTenantStore } from './store';

/** Carrega o tenant do Host atual (bootstrap). */
export function TenantBootstrap({ children }: { children: ReactNode }) {
  const carregar = useTenantStore((s) => s.carregar);
  const carregando = useTenantStore((s) => s.carregando);
  const erro = useTenantStore((s) => s.erro);
  const tenant = useTenantStore((s) => s.tenant);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!tenant) return;
    aplicarBrandingNoDocumento(resolverMarca());
  }, [tenant]);

  if (carregando) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--color-bg)] text-[var(--color-ink-muted)]">
        Carregando…
      </div>
    );
  }

  if (erro || !tenant) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-[var(--color-bg)] px-6 text-center">
        <p className="text-lg font-medium text-[var(--color-ink)]">Domínio não encontrado</p>
        <p className="max-w-md text-sm text-[var(--color-ink-muted)]">
          Este domínio não está vinculado à plataforma nem a um sindicato. Verifique o DNS ou o
          cadastro do host.
        </p>
      </div>
    );
  }

  return children;
}
