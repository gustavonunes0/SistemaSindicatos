import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { RequireRole } from '../auth/components/guards';
import { useAuthStore } from '../auth/store';
import { api } from '../../lib/http';
import { useMarca } from '../../lib/marca';
import { useSeo } from '../../lib/seo';
import { PlataformaLayout } from './PlataformaLayout';

export type TenantLista = {
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

function hostPublico(host: string): boolean {
  const h = host.toLowerCase();
  return h !== 'localhost' && h !== '127.0.0.1' && !h.endsWith('.local');
}

function urlDoHost(host: string): string {
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}:5173`;
  }
  return `https://${host}`;
}

function formatarNumero(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function PlataformaHomePage() {
  const marca = useMarca();

  useSeo({
    title: `${marca.nome} — visão geral`,
    description: marca.nomeCompleto,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['plataforma', 'tenants'],
    queryFn: async () => {
      const { data: body } = await api.get<TenantLista[]>('/plataforma/tenants');
      return body;
    },
  });

  const tenants = data ?? [];
  const ativos = tenants.filter((t) => t.ativo).length;
  const afiliados = tenants.reduce((acc, t) => acc + t._count.afiliados, 0);
  const usuarios = tenants.reduce((acc, t) => acc + t._count.users, 0);
  const dominiosPublicos = tenants.reduce(
    (acc, t) => acc + t.domains.filter((d) => hostPublico(d.host)).length,
    0,
  );

  return (
    <PlataformaLayout
      titulo="Visão geral"
      descricao="Acompanhe os sindicatos hospedados na plataforma e os domínios públicos de cada cliente."
    >
      <section className="sg-kpis" aria-label="Indicadores">
        <article className="sg-kpi">
          <p className="sg-kpi-label">Clientes</p>
          <p className="sg-kpi-valor">{isLoading ? '—' : formatarNumero(tenants.length)}</p>
          <p className="sg-kpi-hint">{ativos} ativos</p>
        </article>
        <article className="sg-kpi">
          <p className="sg-kpi-label">Filiados</p>
          <p className="sg-kpi-valor">{isLoading ? '—' : formatarNumero(afiliados)}</p>
          <p className="sg-kpi-hint">base total nos tenants</p>
        </article>
        <article className="sg-kpi">
          <p className="sg-kpi-label">Usuários</p>
          <p className="sg-kpi-valor">{isLoading ? '—' : formatarNumero(usuarios)}</p>
          <p className="sg-kpi-hint">contas de acesso</p>
        </article>
        <article className="sg-kpi">
          <p className="sg-kpi-label">Domínios</p>
          <p className="sg-kpi-valor">{isLoading ? '—' : formatarNumero(dominiosPublicos)}</p>
          <p className="sg-kpi-hint">hosts públicos</p>
        </article>
      </section>

      <section className="sg-painel" aria-labelledby="sg-clientes-titulo">
        <header className="sg-painel-cabecalho">
          <div>
            <h2 id="sg-clientes-titulo">Sindicatos clientes</h2>
            <p>Site público em domínio próprio · painel e API compartilhados</p>
          </div>
        </header>

        {isLoading && <p className="sg-estado">Carregando clientes…</p>}
        {error && <p className="sg-estado sg-estado--erro">Não foi possível listar os sindicatos.</p>}

        {!isLoading && !error && tenants.length === 0 && (
          <p className="sg-estado">Nenhum sindicato cadastrado ainda.</p>
        )}

        {!isLoading && tenants.length > 0 && (
          <div className="sg-tabela-wrap">
            <table className="sg-tabela">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Status</th>
                  <th scope="col">Filiados</th>
                  <th scope="col">Usuários</th>
                  <th scope="col">Domínios públicos</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const publicos = t.domains.filter((d) => hostPublico(d.host));
                  const internos = t.domains.filter((d) => !hostPublico(d.host));
                  const primarios = publicos.filter((d) => d.primario);
                  const links = primarios.length > 0 ? primarios : publicos;

                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="sg-cliente">
                          <strong>{t.nome}</strong>
                          <span className="sg-slug">{t.slug}</span>
                        </div>
                      </td>
                      <td>
                        <span className={t.ativo ? 'sg-badge sg-badge--ok' : 'sg-badge sg-badge--off'}>
                          {t.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="sg-num">{formatarNumero(t._count.afiliados)}</td>
                      <td className="sg-num">{formatarNumero(t._count.users)}</td>
                      <td>
                        {links.length === 0 && internos.length > 0 && (
                          <span className="sg-muted">somente hosts locais</span>
                        )}
                        <ul className="sg-hosts">
                          {links.map((d) => (
                            <li key={d.host}>
                              <a href={urlDoHost(d.host)} target="_blank" rel="noreferrer">
                                {d.host}
                              </a>
                              {d.primario ? <span className="sg-host-tag">primário</span> : null}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <Link className="sg-btn-ghost sg-btn-ghost--sm" to={`/plataforma/clientes/${t.id}`}>
                          Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PlataformaLayout>
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
      <main className="auth-page auth-page--stellar">
        <section className="auth-card auth-card--stellar">
          <h2>Área da plataforma</h2>
          <p className="auth-stellar-sub">Este domínio é exclusivo da Stellar (SUPERADMIN).</p>
          <Link to="/login">Entrar com outra conta</Link>
        </section>
      </main>
    );
  }
  return <Navigate to="/login" replace />;
}
