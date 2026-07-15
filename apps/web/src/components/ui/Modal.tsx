import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  children: React.ReactNode;
  tamanho?: 'md' | 'lg' | 'xl';
};

export function Modal({
  aberto,
  titulo,
  descricao,
  onFechar,
  children,
  tamanho = 'lg',
}: ModalProps) {
  const tituloId = useId();
  const descricaoId = useId();
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onTecla);

    const focoAnterior = document.activeElement as HTMLElement | null;
    const primeiroFocavel = painelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    primeiroFocavel?.focus();

    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', onTecla);
      focoAnterior?.focus();
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return createPortal(
    <div className="modal-root" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Fechar"
        onClick={onFechar}
      />
      <div
        ref={painelRef}
        className={`modal-painel modal-painel--${tamanho}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricao ? descricaoId : undefined}
      >
        <header className="modal-cabecalho">
          <div className="modal-cabecalho-texto">
            <h2 id={tituloId} className="modal-titulo">
              {titulo}
            </h2>
            {descricao && (
              <p id={descricaoId} className="modal-descricao">
                {descricao}
              </p>
            )}
          </div>
          <button type="button" className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
