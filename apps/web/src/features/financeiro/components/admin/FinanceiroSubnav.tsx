import { NavLink } from 'react-router-dom';

const links = [
  { to: '/admin/financeiro', rotulo: 'Visão geral', end: true },
  { to: '/admin/financeiro/balancetes', rotulo: 'Balancetes', end: false },
  { to: '/admin/financeiro/d8', rotulo: 'D8 (SIAPE)', end: false },
] as const;

export function FinanceiroSubnav() {
  return (
    <nav className="fin-subnav" aria-label="Módulo financeiro">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            isActive ? 'fin-subnav-link fin-subnav-link--ativo' : 'fin-subnav-link'
          }
        >
          {link.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
