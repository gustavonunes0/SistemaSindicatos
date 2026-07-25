import { useState } from 'react';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../../lib/datas';
import { useContestacoes, useResolverContestacao } from '../../hooks';

type ContestacoesAdminPanelProps = {
  eleicaoId: string;
};

const rotuloTipo = { IMPUGNACAO: 'Impugnação', RECURSO: 'Recurso' } as const;
const rotuloStatus = {
  ABERTA: 'Aberta',
  DEFERIDA: 'Deferida',
  INDEFERIDA: 'Indeferida',
} as const;

export function ContestacoesAdminPanel({ eleicaoId }: ContestacoesAdminPanelProps) {
  const { data: contestacoes, isLoading } = useContestacoes(eleicaoId);
  const resolver = useResolverContestacao(eleicaoId);
  const [decisoes, setDecisoes] = useState<Record<string, string>>({});

  return (
    <section className="eleicao-admin-bloco" aria-labelledby="eleicao-contestacoes-titulo">
      <div className="eleicao-admin-bloco-cabecalho">
        <div>
          <h2 id="eleicao-contestacoes-titulo">Impugnações e recursos</h2>
          <p>Prazo de 3 dias úteis a partir da homologação (Art. 38 §13º/§18º/§19º).</p>
        </div>
      </div>

      {isLoading && <EstadoCarregando mensagem="Carregando contestações…" />}
      {contestacoes && contestacoes.length === 0 && (
        <div className="eleicao-admin-vazio">
          <p>Nenhuma contestação registrada.</p>
        </div>
      )}

      {contestacoes && contestacoes.length > 0 && (
        <ul className="eleicao-admin-contestacoes">
          {contestacoes.map((contestacao) => (
            <li className="eleicao-admin-contestacao" key={contestacao.id}>
              <div className="eleicao-admin-contestacao-topo">
                <div>
                  <strong>{rotuloTipo[contestacao.tipo]}</strong>
                  <time dateTime={String(contestacao.createdAt)}>
                    {formatarDataHora(contestacao.createdAt)}
                  </time>
                </div>
                <span className={`badge badge-contestacao-${contestacao.status.toLowerCase()}`}>
                  {rotuloStatus[contestacao.status]}
                </span>
              </div>
              <p className="eleicao-admin-contestacao-motivo">{contestacao.motivo}</p>

              {contestacao.status === 'ABERTA' ? (
                <div className="chapa-card-homologacao">
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
                  <div className="chapa-card-homologacao-acoes">
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
                </div>
              ) : (
                <p className="chapa-card-justificativa">Decisão: {contestacao.decisao}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
