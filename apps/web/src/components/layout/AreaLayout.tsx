import { useEffect, useId, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogoLink } from '../ui/Logo';
import { AlertaPopup } from '../../features/alertas/components/AlertaPopup';
import { BotaoAtualizarPwa } from '../../features/pwa/components/BotaoAtualizarPwa';
import { BotaoInstalarPwa } from '../../features/pwa/components/BotaoInstalarPwa';
import { useLogout, useMe } from '../../features/auth/hooks';
import { useAuthStore } from '../../features/auth/store';
import { usePrefetchAfiliadosAdmin } from '../../features/afiliado/hooks';
import { usePrefetchConveniosAdmin } from '../../features/convenios/hooks';
import { usePrefetchNoticiasAdmin } from '../../features/noticias/hooks';
import { transparenciaFinanceiraAtiva } from '../../features/transparencia/visibilidade';
import { useMarca } from '../../lib/marca';

const LARGURA_SIDEBAR_FIXA = 900;

type AreaTipo = 'admin' | 'afiliado';

type LinkNav = {
  to: string;
  rotulo: string;
  end?: boolean;
  visivel?: boolean;
};

type GrupoNav = {
  id: string;
  titulo?: string;
  /** Grupos sem título ficam sempre abertos (ex.: atalho do site). */
  fixo?: boolean;
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
    id: 'inicio',
    titulo: 'Início',
    links: [
      { to: '/admin', rotulo: 'Painel', end: true },
      { to: '/admin/tutoriais', rotulo: 'Tutoriais' },
    ],
  },
  {
    id: 'pessoas',
    titulo: 'Pessoas',
    links: [
      { to: '/admin/afiliados', rotulo: 'Filiados' },
      { to: '/admin/diretoria', rotulo: 'Diretoria' },
    ],
  },
  {
    id: 'gestao',
    titulo: 'Gestão',
    links: [
      { to: '/admin/financeiro', rotulo: 'Financeiro' },
      { to: '/admin/declaracoes', rotulo: 'Declarações' },
      { to: '/admin/juridico', rotulo: 'Jurídico' },
      { to: '/admin/eleicoes', rotulo: 'Eleições' },
      { to: '/admin/estatutos', rotulo: 'Estatutos' },
    ],
  },
  {
    id: 'conteudo',
    titulo: 'Conteúdo',
    links: [
      { to: '/admin/noticias', rotulo: 'Notícias' },
      { to: '/admin/alertas', rotulo: 'Alertas' },
      { to: '/admin/formularios', rotulo: 'Formulários' },
      { to: '/admin/convenios', rotulo: 'Convênios' },
      { to: '/admin/eventos', rotulo: 'Eventos' },
      { to: '/admin/imoveis', rotulo: 'Apartamentos' },
    ],
  },
  {
    id: 'site',
    fixo: true,
    links: [{ to: '/', rotulo: 'Site público' }],
  },
];

function PrefetchAdmin() {
  usePrefetchNoticiasAdmin();
  usePrefetchConveniosAdmin();
  usePrefetchAfiliadosAdmin();
  return null;
}

function rotaAtivaNoGrupo(pathname: string, links: LinkNav[]): boolean {
  return links.some((link) => {
    if (link.end) return pathname === link.to;
    return pathname === link.to || pathname.startsWith(`${link.to}/`);
  });
}

export function AreaLayout({ tipo, titulo, descricao, acoes, children }: AreaLayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const sidebarId = useId();
  const { data } = useMe();
  const logout = useLogout();
  const role = useAuthStore((state) => state.user?.role);
  const marca = useMarca();
  const { pathname } = useLocation();
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});

  const mostrarTransparencia = transparenciaFinanceiraAtiva(marca);
  const mostrarDiretoria = Boolean(data?.afiliado?.diretor);
  const adminEmVisaoFiliado = role === 'ADMIN' && tipo === 'afiliado';
  const podeTrocarVisao = role === 'ADMIN';

  const fecharMenu = () => setMenuAberto(false);
  const alternarMenu = () => setMenuAberto((aberto) => !aberto);

  // Fecha ao mudar de rota (ex.: botão voltar do browser).
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  // Trava o scroll do fundo e fecha com Escape no mobile.
  useEffect(() => {
    if (!menuAberto) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setMenuAberto(false);
    }

    window.addEventListener('keydown', onTecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', onTecla);
    };
  }, [menuAberto]);

  // Em desktop a sidebar é fixa — não deixa o estado "aberto" preso.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= LARGURA_SIDEBAR_FIXA) {
        setMenuAberto(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const gruposAfiliado: GrupoNav[] = useMemo(
    () => [
      {
        id: 'inicio',
        titulo: 'Início',
        links: [{ to: '/afiliado', rotulo: 'Visão geral', end: true }],
      },
      {
        id: 'beneficios',
        titulo: 'Benefícios',
        links: [
          { to: '/afiliado/convenios', rotulo: 'Convênios' },
          { to: '/afiliado/declaracoes', rotulo: 'Declarações' },
          { to: '/afiliado/eventos', rotulo: 'Eventos' },
          { to: '/afiliado/imoveis', rotulo: 'Apartamentos' },
        ],
      },
      {
        id: 'sindicato',
        titulo: 'Sindicato',
        links: [
          { to: '/afiliado/estatutos', rotulo: 'Estatutos' },
          {
            to: '/afiliado/transparencia',
            rotulo: 'Transparência',
            visivel: mostrarTransparencia,
          },
          { to: '/afiliado/juridico', rotulo: 'Jurídico' },
          {
            to: '/afiliado/diretoria',
            rotulo: 'Diretoria',
            visivel: mostrarDiretoria,
          },
        ],
      },
      {
        id: 'participacao',
        titulo: 'Participação',
        links: [
          { to: '/afiliado/formularios', rotulo: 'Formulários' },
          { to: '/afiliado/eleicoes', rotulo: 'Eleições' },
        ],
      },
      {
        id: 'site',
        fixo: true,
        links: [{ to: '/', rotulo: 'Site institucional' }],
      },
    ],
    [mostrarDiretoria, mostrarTransparencia],
  );

  const grupos = tipo === 'admin' ? gruposAdmin : gruposAfiliado;

  // Garante o grupo da rota atual aberto, sem fechar os que o usuário expandiu.
  useEffect(() => {
    setGruposAbertos((atual) => {
      let mudou = false;
      const proximos = { ...atual };

      for (const grupo of grupos) {
        if (grupo.fixo || !grupo.titulo) {
          if (!proximos[grupo.id]) {
            proximos[grupo.id] = true;
            mudou = true;
          }
          continue;
        }

        const links = grupo.links.filter((link) => link.visivel !== false);
        if (rotaAtivaNoGrupo(pathname, links) && !proximos[grupo.id]) {
          proximos[grupo.id] = true;
          mudou = true;
        }
      }

      return mudou ? proximos : atual;
    });
  }, [grupos, pathname]);

  const rotuloArea = tipo === 'admin' ? 'Administração' : 'Área do sindicalizado';
  const identificacao =
    tipo === 'admin' ? data?.user.email : (data?.afiliado?.nome ?? data?.user.email);

  function alternarGrupo(id: string) {
    setGruposAbertos((atual) => ({ ...atual, [id]: !atual[id] }));
  }

  return (
    <div
      className={`area-shell area-shell--${tipo}${menuAberto ? ' area-shell--menu-aberto' : ''}`}
    >
      {tipo === 'admin' ? <PrefetchAdmin /> : null}

      <div className="area-mobile-bar">
        <button
          type="button"
          className={`area-menu-toggle${menuAberto ? ' area-menu-toggle--aberto' : ''}`}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls={sidebarId}
          onClick={alternarMenu}
        >
          <span className="area-menu-toggle-barras" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className="area-mobile-bar-texto">
          <span className="area-mobile-bar-marca">{marca.nome}</span>
          <span className="area-mobile-bar-area">{rotuloArea}</span>
        </div>
        {podeTrocarVisao && (
          <Link
            to={tipo === 'admin' ? '/afiliado' : '/admin'}
            className="area-mobile-bar-trocar"
            onClick={fecharMenu}
          >
            {tipo === 'admin' ? 'Ver filiado' : 'Voltar admin'}
          </Link>
        )}
      </div>

      <button
        type="button"
        className={`area-sidebar-overlay${menuAberto ? ' area-sidebar-overlay--visivel' : ''}`}
        aria-label="Fechar menu"
        tabIndex={menuAberto ? 0 : -1}
        aria-hidden={!menuAberto}
        onClick={fecharMenu}
      />

      <aside
        id={sidebarId}
        className={`area-sidebar${menuAberto ? ' aberto' : ''}`}
        aria-modal={menuAberto || undefined}
        role={menuAberto ? 'dialog' : undefined}
        aria-label={rotuloArea}
      >
        <div className="area-sidebar-topo">
          <div className="area-sidebar-topo-linha">
            <LogoLink
              to={tipo === 'admin' ? '/admin' : '/afiliado'}
              variante="sidebar"
              onClick={fecharMenu}
            />
            <button
              type="button"
              className="area-sidebar-fechar"
              aria-label="Fechar menu"
              onClick={fecharMenu}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <span className="area-sidebar-tipo">{rotuloArea}</span>
        </div>

        <nav className="area-sidebar-nav" aria-label={rotuloArea}>
          {grupos.map((grupo) => {
            const links = grupo.links.filter((link) => link.visivel !== false);
            if (links.length === 0) return null;

            const colapsavel = Boolean(grupo.titulo) && !grupo.fixo;
            const aberto = grupo.fixo || Boolean(gruposAbertos[grupo.id]);

            return (
              <div
                key={grupo.id}
                className={`area-nav-grupo ${colapsavel ? 'area-nav-grupo--colapsavel' : ''} ${
                  aberto ? 'area-nav-grupo--aberto' : ''
                }`}
              >
                {grupo.titulo && colapsavel ? (
                  <button
                    type="button"
                    className="area-nav-grupo-titulo"
                    aria-expanded={aberto}
                    onClick={() => alternarGrupo(grupo.id)}
                  >
                    <span>{grupo.titulo}</span>
                    <span className="area-nav-grupo-chevron" aria-hidden="true">
                      {aberto ? '−' : '+'}
                    </span>
                  </button>
                ) : (
                  grupo.titulo && <p className="area-nav-grupo-titulo">{grupo.titulo}</p>
                )}

                {aberto &&
                  links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        isActive ? 'area-nav-link ativo' : 'area-nav-link'
                      }
                      onClick={fecharMenu}
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
                {tipo === 'admin'
                  ? 'Administrador'
                  : adminEmVisaoFiliado
                    ? 'Admin · visão filiado'
                    : 'Filiado'}
              </span>
              <span className="area-sidebar-usuario">{identificacao}</span>
            </div>
          )}
          {podeTrocarVisao && (
            <Link
              to={tipo === 'admin' ? '/afiliado' : '/admin'}
              className="area-sidebar-trocar-visao"
              onClick={fecharMenu}
            >
              {tipo === 'admin' ? 'Ver como filiado' : 'Voltar ao painel admin'}
            </Link>
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
            {acoes && <div className="area-topo-acoes">{acoes}</div>}
          </header>
        )}
        {children}
      </div>

      {tipo === 'afiliado' ? <AlertaPopup /> : null}
      <BotaoAtualizarPwa />
      <BotaoInstalarPwa />
    </div>
  );
}
