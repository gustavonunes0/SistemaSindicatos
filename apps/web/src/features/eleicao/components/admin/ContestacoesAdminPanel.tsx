import { useState } from 'react';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../../lib/datas';
import { useContestacoes, useResolverContestacao } from '../../hooks';

type ContestacoesAdminPanelProps = {
  eleicaoId: string;
};

const rotuloTipo = { IMPUGNACAO: 'Impugnação', RECURSO: 'Recurso' } as const;

export function ContestacoesAdminPanel({ eleicaoId }: ContestacoesAdminPanelProps) {
  const { data: contestacoes, isLoading } = useContestacoes(eleicaoId);
  const resolver = useResolverContestacao(eleicaoId);
  const [decisoes, setDecisoes] = useState<Record<string, string>>({});

  return (
    <section className="painel-secao">
      <div className="dash-secao-cabecalho">
        <h2 className="painel-secao-titulo">Impugnações e recursos</h2>
        <p className="dash-secao-ajuda">
          Prazo de 3 dias úteis a partir da homologação (Art. 38 §13º/§18º/§19º).
        </p>
      </div>

      {isLoading && <EstadoCarregando mensagem="Carregando contestações…" />}
      {contestacoes && contestacoes.length === 0 && <p>Nenhuma contestação registrada.</p>}

      {contestacoes && contestacoes.length > 0 && (
        <ul className="candidatos-lista" style={{ gap: '1rem' }}>
          {contestacoes.map((contestacao) => (
            <li key={contestacao.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="chapa-card-cabecalho">
                <span>
                  <strong>{rotuloTipo[contestacao.tipo]}</strong> ·{' '}
                  {formatarDataHora(contestacao.createdAt)}
                </span>
                <span className={`badge badge-contestacao-${contestacao.status.toLowerCase()}`}>
                  {contestacao.status}
                </span>
              </div>
              <p>{contestacao.motivo}</p>

              {contestacao.status === 'ABERTA' ? (
                <div className="form-linha">
                  <label>
                    Decisão
                    <input
                      type="text"
                      value={decisoes[contestacao.id] ?? ''}
                      onChange={(evento) =>
                        setDecisoes((atual) => ({
                          ...atual,
                          [contestacao.id]: evento.target.value,
                        }))
                      }
                      placeholder="Justificativa da decisão"
                    />
                  </label>
                  <button
                    type="button"
                    className="botao-primario"
                    disabled={resolver.isPending || !decisoes[contestacao.id]?.trim()}
                    onClick={() =>
                      resolver.mutate({
                        contestacaoId: contestacao.id,
                        status: 'DEFERIDA',
                        decisao: decisoes[contestacao.id]!.trim(),
                      })
                    }
                  >
                    Deferir
                  </button>
                  <button
                    type="button"
                    className="botao-perigo"
                    disabled={resolver.isPending || !decisoes[contestacao.id]?.trim()}
                    onClick={() =>
                      resolver.mutate({
                        contestacaoId: contestacao.id,
                        status: 'INDEFERIDA',
                        decisao: decisoes[contestacao.id]!.trim(),
                      })
                    }
                  >
                    Indeferir
                  </button>
                </div>
              ) : (
                <p className="dash-secao-ajuda">Decisão: {contestacao.decisao}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
