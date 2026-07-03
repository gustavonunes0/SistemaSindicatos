import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogoLink } from '../ui/Logo';
import { useLogout, useMe } from '../../features/auth/hooks';

type AreaTipo = 'admin' | 'afiliado';

type LinkNav = {
  to: string;
  rotulo: string;
  end?: boolean;
  visivel?: boolean;
};

type AreaLayoutProps = {
  tipo: AreaTipo;
  titulo?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
};

const linksAdmin: LinkNav[] = [
  { to: '/admin', rotulo: 'Painel', end: true },
  { to: '/admin/noticias', rotulo: 'Notícias' },
  { to: '/admin/convenios', rotulo: 'Convênios' },
  { to: '/admin/imoveis', rotulo: 'Apartamentos' },
  { to: '/admin/solicitacoes', rotulo: 'Solicitações' },
  { to: '/', rotulo: 'Site público' },
];

export function AreaLayout({ tipo, titulo, acoes, children }: AreaLayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { data } = useMe();
  const logout = useLogout();
  const aprovado = data?.afiliado?.status === 'APROVADO';

  const linksAfiliado: LinkNav[] = [
    { to: '/afiliado', rotulo: 'Minha área', end: true },
    { to: '/afiliado/convenios', rotulo: 'Convênios', visivel: aprovado },
    { to: '/afiliado/imoveis', rotulo: 'Apartamentos', visivel: aprovado },
    { to: '/afiliado/solicitacoes', rotulo: 'Solicitações', visivel: aprovado },
  ];

  const links = tipo === 'admin' ? linksAdmin : linksAfiliado.filter((link) => link.visivel !== false);
  const rotuloArea = tipo === 'admin' ? 'Administração' : 'Área do afiliado';
  const identificacao =
    tipo === 'admin'
      ? data?.user.email
      : data?.afiliado?.nome ?? data?.user.email;

  return (
    <div className="area-shell">
      <button
        type="button"
        className="area-menu-toggle"
        aria-label={menuAberto ? 'Fechar menu lateral' : 'Abrir menu lateral'}
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((aberto) => !aberto)}
      >
        {menuAberto ? 'Fechar' : 'Menu'}
      </button>

      {menuAberto && (
        <button
          type="button"
          className="area-sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside className={`area-sidebar ${menuAberto ? 'aberto' : ''}`}>
        <div className="area-sidebar-topo">
          <LogoLink
            to={tipo === 'admin' ? '/admin' : '/afiliado'}
            variante="sidebar"
            onClick={() => setMenuAberto(false)}
          />
          <span className="area-sidebar-tipo">{rotuloArea}</span>
        </div>

        <nav className="area-sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? 'area-nav-link ativo' : 'area-nav-link'
              }
              onClick={() => setMenuAberto(false)}
            >
              {link.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="area-sidebar-rodape">
          {identificacao && <span className="area-sidebar-usuario">{identificacao}</span>}
          <button
            type="button"
            className="area-sidebar-sair"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="area-conteudo">
        {(titulo || acoes) && (
          <header className="area-topo">
            {titulo && <h1>{titulo}</h1>}
            {acoes && <div className="area-topo-acoes">{acoes}</div>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
