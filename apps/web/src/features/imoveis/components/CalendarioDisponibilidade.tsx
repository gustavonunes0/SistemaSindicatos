import { useMemo, useState } from 'react';
import { inicioDoMes, fimDoMes, rotuloMes, diasDoMes, estadoDoDia } from '../calendario';
import { useDisponibilidadeImovel } from '../hooks';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type CalendarioDisponibilidadeProps = {
  imovelId: string;
};

export function CalendarioDisponibilidade({ imovelId }: CalendarioDisponibilidadeProps) {
  const [mesReferencia, setMesReferencia] = useState(() => new Date());
  const consulta = useMemo(
    () => ({
      inicio: inicioDoMes(mesReferencia),
      fim: fimDoMes(mesReferencia),
    }),
    [mesReferencia],
  );

  const { data, isLoading, isError } = useDisponibilidadeImovel(imovelId, consulta);
  const celulas = diasDoMes(mesReferencia);

  const mesAnterior = () => {
    setMesReferencia(
      (atual) => new Date(atual.getFullYear(), atual.getMonth() - 1, 1),
    );
  };

  const proximoMes = () => {
    setMesReferencia(
      (atual) => new Date(atual.getFullYear(), atual.getMonth() + 1, 1),
    );
  };

  return (
    <section className="calendario-disponibilidade" aria-label="Disponibilidade do imóvel">
      <header className="calendario-cabecalho">
        <h2>Disponibilidade</h2>
        <div className="calendario-navegacao">
          <button type="button" onClick={mesAnterior} aria-label="Mês anterior">
            ←
          </button>
          <span className="calendario-mes">{rotuloMes(mesReferencia)}</span>
          <button type="button" onClick={proximoMes} aria-label="Próximo mês">
            →
          </button>
        </div>
      </header>

      {isLoading && <p className="estado-carregando">Carregando calendário…</p>}
      {isError && (
        <p className="erro">Não foi possível carregar a disponibilidade deste mês.</p>
      )}

      {data && (
        <>
          <div className="calendario-legenda">
            <span className="calendario-legenda-item livre">Livre</span>
            <span className="calendario-legenda-item reservado">Reservado</span>
            <span className="calendario-legenda-item bloqueado">Indisponível</span>
          </div>

          <div className="calendario-grade">
            {DIAS_SEMANA.map((dia) => (
              <span key={dia} className="calendario-dia-semana">
                {dia}
              </span>
            ))}
            {celulas.map((dia, indice) => {
              if (dia === null) {
                return <span key={`vazio-${indice}`} className="calendario-celula vazia" />;
              }
              const estado = estadoDoDia(mesReferencia, dia, data.periodos);
              return (
                <span
                  key={dia}
                  className={`calendario-celula ${estado}`}
                  aria-label={`Dia ${dia}: ${estado}`}
                >
                  {dia}
                </span>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
