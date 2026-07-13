type EstadoCarregandoProps = {
  mensagem?: string;
};

export function EstadoCarregando({ mensagem = 'Carregando…' }: EstadoCarregandoProps) {
  return (
    <div className="estado-carregando" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{mensagem}</span>
    </div>
  );
}
