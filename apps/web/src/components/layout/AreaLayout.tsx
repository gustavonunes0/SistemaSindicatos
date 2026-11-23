import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogoLink } from '../ui/Logo';
import { AlertaPopup } from '../../features/alertas/components/AlertaPopup';
import { BotaoAtualizarPwa } from '../../features/pwa/components/BotaoAtualizarPwa';
import { BotaoInstalarPwa } from '../../features/pwa/components/BotaoInstalarPwa';
import { useLogout, useMe } from '../../features/auth/hooks';
import { usePrefetchAfiliadosAdmin } from '../../features/afiliado/hooks';
import { usePrefetchConveniosAdmin } from '../../features/convenios/hooks';
import { usePrefetchNoticiasAdmin } from '../../features/noticias/hooks';
import { transparenciaFinanceiraAtiva } from '../../features/transparencia/visibilidade';
import { useMarca } from '../../lib/marca';

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
  const { data } = useMe();
  const logout = useLogout();
  const marca = useMarca();
  const { pathname } = useLocation();
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});

  const mostrarTransparencia = transparenciaFinanceiraAtiva(marca);
  const mostrarDiretoria = Boolean(data?.afiliado?.diretor);

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
    <div className={`area-shell area-shell--${tipo}`}>
      {tipo === 'admin' ? <PrefetchAdmin /> : null}
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
                {tipo === 'admin' ? 'Administrador' : 'Filiado'}
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
