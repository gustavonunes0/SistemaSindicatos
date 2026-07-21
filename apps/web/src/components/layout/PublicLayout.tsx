import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { MarcaHeaderLink } from '../ui/MarcaHeader';
import { LogoLink } from '../ui/Logo';
import { BotaoInstalarPwa } from '../../features/pwa/components/BotaoInstalarPwa';
import { usePushNoticiasPorPadrao } from '../../features/pwa/hooks/usePushNoticias';
import { useAuthStore } from '../../features/auth/store';
import { areaPorRole } from '../../features/auth/hooks';
import { marca } from '../../lib/marca';

const links = [
  { to: '/', rotulo: 'Início' },
  { to: '/noticias', rotulo: 'Notícias' },
  { to: '/sobre', rotulo: 'Sobre' },
  { to: '/diretoria', rotulo: 'Diretoria' },
  { to: '/contato', rotulo: 'Contato' },
];

export function PublicLayout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const user = useAuthStore((state) => state.user);
  usePushNoticiasPorPadrao();

  return (
    <div className="site">
      <header className="site-header">
        <div className="site-header-inner">
          <MarcaHeaderLink to="/" onClick={() => setMenuAberto(false)} />

          <button
            type="button"
            className="menu-toggle"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            {menuAberto ? '✕' : '☰'}
          </button>

          <nav className={`site-nav ${menuAberto ? 'aberto' : ''}`}>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuAberto(false)}
              >
                {link.rotulo}
              </NavLink>
            ))}
            <Link
              to={user ? areaPorRole(user.role) : '/login'}
              className="botao-area"
              onClick={() => setMenuAberto(false)}
            >
              {user ? 'Minha área' : 'Entrar'}
            </Link>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-marca">
            <LogoLink to="/" variante="footer" />
            <h3>{marca.nome}</h3>
            <p>{marca.nomeCompleto}</p>
          </div>
          <div>
            <h4>Contato</h4>
            <p>
              <a href={`mailto:${marca.contato.email}`}>{marca.contato.email}</a>
            </p>
            <p>{marca.contato.telefones.join(' / ')}</p>
          </div>
          <div>
            <h4>Endereço</h4>
            <p>{marca.sede.endereco}</p>
            <p>CEP {marca.sede.cep}</p>
          </div>
        </div>
        <div className="site-footer-copy">
          <span>© {new Date().getFullYear()} {marca.nome}. Todos os direitos reservados.</span>
          <span>
            Desenvolvido por <a href="https://stellar.dev">Stellar</a>
          </span>
        </div>
      </footer>

      <BotaoInstalarPwa />
    </div>
  );
}
