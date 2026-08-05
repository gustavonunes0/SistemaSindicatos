import { Link } from 'react-router-dom';
import { useMarca } from '../../lib/marca';

type LogoVariante = 'header' | 'emblema' | 'sidebar' | 'auth' | 'footer' | 'hero';

type LogoProps = {
  variante?: LogoVariante;
  className?: string;
};

export function Logo({ variante = 'header', className }: LogoProps) {
  const marca = useMarca();
  const src =
    (variante === 'header' || variante === 'footer' || variante === 'sidebar') &&
    marca.logoHeaderUrl
      ? marca.logoHeaderUrl
      : marca.logoUrl;
  const ehWordmark = src === marca.logoHeaderUrl && Boolean(marca.logoHeaderUrl);

  return (
    <img
      src={src}
      alt={`${marca.nome} — ${marca.nomeCompleto}`}
      className={['logo', `logo-${variante}`, ehWordmark ? 'logo-wordmark' : '', className]
        .filter(Boolean)
        .join(' ')}
      width={
        ehWordmark
          ? variante === 'header'
            ? 160
            : 140
          : variante === 'hero'
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
        ehWordmark
          ? variante === 'header'
            ? 28
            : 24
          : variante === 'hero'
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
