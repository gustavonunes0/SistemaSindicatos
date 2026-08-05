import { Link } from 'react-router-dom';
import { useMarca } from '../../lib/marca';
import { Logo } from './Logo';

export function MarcaNome() {
  const marca = useMarca();
  return (
    <span className="marca-nome">
      <span className="marca-nome-faixa" aria-hidden="true" />
      <span className="marca-nome-texto">{marca.nome}</span>
    </span>
  );
}

type MarcaHeaderLinkProps = {
  to: string;
  onClick?: () => void;
};

export function MarcaHeaderLink({ to, onClick }: MarcaHeaderLinkProps) {
  return (
    <Link to={to} className="marca-header" onClick={onClick}>
      <Logo variante="emblema" />
      <MarcaNome />
    </Link>
  );
}
