import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogoLink } from '../ui/Logo';
import { BotaoInstalarPwa } from '../../features/pwa/components/BotaoInstalarPwa';
import { useLogout, useMe } from '../../features/auth/hooks';

type AreaTipo = 'admin' | 'afiliado';

type LinkNav = {
  to: string;
  rotulo: string;
  end?: boolean;
  visivel?: boolean;
};

type GrupoNav = {
  titulo?: string;
  links: LinkNav[];
};

type AreaLayoutProps = {
  tipo: AreaTipo;
  titulo?: string;
  descricao?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
};

const gruposAdmin: GrupoNav[] = [
  {
    titulo: 'Operação',
    links: [
      { to: '/admin', rotulo: 'Painel', end: true },
      { to: '/admin/afiliados', rotulo: 'Afiliados' },
      { to: '/admin/solicitacoes', rotulo: 'Solicitações' },
      { to: '/admin/eleicoes', rotulo: 'Eleições' },
    ],
  },
  {
    titulo: 'Conteúdo',
    links: [
      { to: '/admin/noticias', rotulo: 'Notícias' },
      { to: '/admin/convenios', rotulo: 'Convênios' },
      { to: '/admin/imoveis', rotulo: 'Apartamentos' },
    ],
  },
  {
    links: [{ to: '/', rotulo: 'Site público' }],
  },
];

export function AreaLayout({ tipo, titulo, descricao, acoes, children }: AreaLayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { data } = useMe();
  const logout = useLogout();

  const gruposAfiliado: GrupoNav[] = [
    {
      titulo: 'Minha conta',
      links: [
        { to: '/afiliado', rotulo: 'Visão geral', end: true },
        { to: '/afiliado/convenios', rotulo: 'Convênios' },
        { to: '/afiliado/imoveis', rotulo: 'Apartamentos' },
        { to: '/afiliado/solicitacoes', rotulo: 'Solicitações' },
        { to: '/afiliado/eleicoes', rotulo: 'Eleições' },
      ],
    },
    {
      links: [{ to: '/', rotulo: 'Site institucional' }],
    },
  ];

  const grupos = tipo === 'admin' ? gruposAdmin : gruposAfiliado;
  const rotuloArea = tipo === 'admin' ? 'Administração' : 'Área do afiliado';
  const identificacao =
    tipo === 'admin' ? data?.user.email : (data?.afiliado?.nome ?? data?.user.email);

  return (
    <div className={`area-shell area-shell--${tipo}`}>
      <button
        type="button"
        className="area-menu-toggle"
        aria-label={menuAberto ? 'Fechar menu lateral' : 'Abrir menu lateral'}
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((aberto) => !aberto)}
      >
        <span className="area-menu-toggle-barras" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
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

        <nav className="area-sidebar-nav" aria-label={rotuloArea}>
          {grupos.map((grupo, indiceGrupo) => {
            const links = grupo.links.filter((link) => link.visivel !== false);
            if (links.length === 0) return null;

            return (
              <div key={grupo.titulo ?? `grupo-${indiceGrupo}`} className="area-nav-grupo">
                {grupo.titulo && <p className="area-nav-grupo-titulo">{grupo.titulo}</p>}
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
              </div>
            );
          })}
        </nav>

        <div className="area-sidebar-rodape">
          {identificacao && (
            <div className="area-sidebar-usuario-bloco">
              <span className="area-sidebar-papel">
                {tipo === 'admin' ? 'Administrador' : 'Afiliado'}
              </span>
              <span className="area-sidebar-usuario">{identificacao}</span>
            </div>
          )}
          <button
            type="button"
            className="area-sidebar-sair"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Encerrar sessão
          </button>
        </div>
      </aside>

      <div className="area-conteudo">
        {(titulo || acoes || descricao || tipo === 'afiliado') && (
          <header className="area-topo">
            <div className="area-topo-texto">
              {tipo === 'admin' && <span className="eyebrow">Painel administrativo</span>}
              {titulo && <h1>{titulo}</h1>}
              {descricao && <p className="area-topo-descricao">{descricao}</p>}
            </div>
            {(acoes || tipo === 'afiliado') && (
              <div className="area-topo-acoes">
                {tipo === 'afiliado' && (
                  <Link to="/" className="botao-secundario">
                    Site institucional
                  </Link>
                )}
                {acoes}
              </div>
            )}
          </header>
        )}
        {children}
      </div>

      <BotaoInstalarPwa />
    </div>
  );
}
