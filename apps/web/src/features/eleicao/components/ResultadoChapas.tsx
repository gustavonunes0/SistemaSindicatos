import type { ResultadoEleicao } from '@sindprf/types';
import { numeroCedula } from '../rotulos';

/** Barras de apuração — usado na área do filiado e no detalhe administrativo. */
export function ResultadoChapas({ resultado }: { resultado: ResultadoEleicao }) {
  const ordenados = [...resultado.resultados].sort((a, b) => b.totalVotos - a.totalVotos);
  const maisVotos = ordenados[0]?.totalVotos ?? 0;
  const empatadas = ordenados.filter((item) => item.totalVotos === maisVotos).length;
  const destacarLider = maisVotos > 0 && empatadas === 1 && !resultado.porAclamacao;

  if (ordenados.length === 0) {
    return <p className="resultado-vazio">Nenhuma chapa apurada nesta eleição.</p>;
  }

  return (
    <ol className="resultado-lista">
      {ordenados.map((item, indice) => (
        <li
          key={item.chapaId}
          className={`resultado-linha ${destacarLider && indice === 0 ? 'resultado-linha--lider' : ''}`}
        >
          <div className="resultado-linha-topo">
            <span className="resultado-linha-chapa">
              <span className="resultado-linha-numero" aria-hidden="true">
                {numeroCedula(item.numero)}
              </span>
              <span>
                <strong>{item.nome}</strong>
                <span className="resultado-linha-rotulo">Chapa {item.numero}</span>
              </span>
            </span>
            <span className="resultado-linha-votos">
              <strong>{item.totalVotos}</strong>
              <span>
                {item.totalVotos === 1 ? 'voto' : 'votos'} · {item.percentual.toFixed(1)}%
              </span>
            </span>
          </div>
          <div
            className="resultado-barra-trilho"
            role="progressbar"
            aria-valuenow={Math.round(item.percentual)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Chapa ${item.numero} — ${item.nome}`}
          >
            <div className="resultado-barra-preenchimento" style={{ width: `${item.percentual}%` }} />
          </div>
          {destacarLider && indice === 0 && (
            <p className="resultado-linha-marca">Mais votada na urna eletrônica</p>
          )}
        </li>
      ))}
    </ol>
  );
}
