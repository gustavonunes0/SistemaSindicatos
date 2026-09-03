import { useMemo, useState } from 'react';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import {
  diasDoMes,
  ehHoje,
  estadoDoDia,
  fimDoMes,
  inicioDoMes,
  resumirMes,
  rotuloEstadoDia,
  rotuloMes,
} from '../calendario';
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

  const { data, isLoading, isError, isFetching } = useDisponibilidadeImovel(imovelId, consulta);
  const celulas = diasDoMes(mesReferencia);
  const resumo = data ? resumirMes(mesReferencia, data.periodos) : null;

  const mesAnterior = () => {
    setMesReferencia((atual) => new Date(atual.getFullYear(), atual.getMonth() - 1, 1));
  };

  const proximoMes = () => {
    setMesReferencia((atual) => new Date(atual.getFullYear(), atual.getMonth() + 1, 1));
  };

  return (
    <section
      className={`calendario-disponibilidade${isFetching ? ' calendario-disponibilidade--atualizando' : ''}`}
      aria-label="Disponibilidade do imóvel"
    >
      <header className="calendario-cabecalho">
        <div>
          <p className="eyebrow">Agenda</p>
          <h2>Disponibilidade</h2>
        </div>
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

      {isLoading && !data && <EstadoCarregando mensagem="Carregando calendário…" />}
      {isError && (
        <p className="erro">Não foi possível carregar a disponibilidade deste mês.</p>
      )}

      {data && (
        <>
          {resumo && (
            <p className="calendario-resumo">
              <strong>{resumo.livres}</strong> {resumo.livres === 1 ? 'dia livre' : 'dias livres'}
              {' · '}
              <strong>{resumo.ocupados}</strong>{' '}
              {resumo.ocupados === 1 ? 'ocupado ou bloqueado' : 'ocupados ou bloqueados'}
            </p>
          )}

          <div className="calendario-legenda">
            <span className="calendario-legenda-item livre">Livre</span>
            <span className="calendario-legenda-item reservado">Reservado</span>
            <span className="calendario-legenda-item bloqueado">Indisponível</span>
          </div>

          <div className="calendario-grade" role="grid" aria-label={rotuloMes(mesReferencia)}>
            {DIAS_SEMANA.map((dia) => (
              <span key={dia} className="calendario-dia-semana" role="columnheader">
                {dia}
              </span>
            ))}
            {celulas.map((dia, indice) => {
              if (dia === null) {
                return <span key={`vazio-${indice}`} className="calendario-celula vazia" />;
              }
              const estado = estadoDoDia(mesReferencia, dia, data.periodos);
              const hoje = ehHoje(mesReferencia, dia);
              return (
                <span
                  key={dia}
                  className={`calendario-celula ${estado}${hoje ? ' hoje' : ''}`}
                  aria-label={`Dia ${dia}: ${rotuloEstadoDia(estado)}${hoje ? ', hoje' : ''}`}
                >
                  {dia}
                </span>
              );
            })}
          </div>

          <p className="calendario-nota">
            Este calendário é consultivo. A reserva só é confirmada no sistema oficial do sindicato.
          </p>
        </>
      )}
    </section>
  );
}
