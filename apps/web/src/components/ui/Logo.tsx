import { Link } from 'react-router-dom';
import { marca } from '../../lib/marca';

type LogoVariante = 'header' | 'emblema' | 'sidebar' | 'auth' | 'footer' | 'hero';

type LogoProps = {
  variante?: LogoVariante;
  className?: string;
};

export function Logo({ variante = 'header', className }: LogoProps) {
  return (
    <img
      src={marca.logo}
      alt={`${marca.nome} — ${marca.nomeCompleto}`}
      className={['logo', `logo-${variante}`, className].filter(Boolean).join(' ')}
      width={
        variante === 'hero'
          ? 120
          : variante === 'auth'
            ? 96
            : variante === 'emblema'
              ? 72
              : variante === 'header'
                ? 88
                : 56
      }
      height={
        variante === 'hero'
          ? 120
          : variante === 'auth'
            ? 96
            : variante === 'emblema'
              ? 72
              : variante === 'header'
                ? 88
                : 56
      }
      decoding="async"
    />
  );
}

type LogoLinkProps = LogoProps & {
  to: string;
  onClick?: () => void;
};

export function LogoLink({ to, variante = 'header', className, onClick }: LogoLinkProps) {
  return (
    <Link to={to} className="logo-link" onClick={onClick}>
      <Logo variante={variante} className={className} />
    </Link>
  );
}
