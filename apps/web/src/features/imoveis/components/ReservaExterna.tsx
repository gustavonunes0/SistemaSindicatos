import { useMarca } from '../../../lib/marca';

type ReservaExternaProps = {
  titulo: string;
  descricao: string;
};

/** A reserva acontece no sistema oficial do sindicato, fora desta aplicação. */
export function ReservaExterna({ titulo, descricao }: ReservaExternaProps) {
  const marca = useMarca();

  return (
    <section className="reserva-destaque">
      <p className="eyebrow">Reserva</p>
      <h2>{titulo}</h2>
      <p>{descricao}</p>

      <div className="reserva-acoes">
        {marca.reservaApartamentosUrl ? (
          <a
            className="botao-primario"
            href={marca.reservaApartamentosUrl}
            target="_blank"
            rel="noreferrer"
          >
            Fazer reserva
            <span aria-hidden="true"> ↗</span>
          </a>
        ) : (
          <p className="texto-secundario">
            O link de reservas ainda não foi configurado. Procure a secretaria pelos telefones{' '}
            {marca.contato.telefones.join(' / ')}.
          </p>
        )}

        {marca.regulamentoApartamentosUrl && (
          <a
            className="botao-secundario"
            href={marca.regulamentoApartamentosUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ler o regulamento (PDF)
            <span aria-hidden="true"> ↗</span>
          </a>
        )}
      </div>
    </section>
  );
}
