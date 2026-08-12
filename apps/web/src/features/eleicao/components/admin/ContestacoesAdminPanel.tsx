import { useState } from 'react';
import type { Chapa } from '@sindprf/types';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../../lib/datas';
import { useContestacoes, useResolverContestacao } from '../../hooks';
import { rotuloStatusContestacao, rotuloTipoContestacao } from '../../rotulos';

type ContestacoesAdminPanelProps = {
  eleicaoId: string;
  chapas: Chapa[];
};

export function ContestacoesAdminPanel({ eleicaoId, chapas }: ContestacoesAdminPanelProps) {
  const { data: contestacoes, isLoading } = useContestacoes(eleicaoId);
  const resolver = useResolverContestacao(eleicaoId);
  const [decisoes, setDecisoes] = useState<Record<string, string>>({});

  const abertas = contestacoes?.filter((item) => item.status === 'ABERTA').length ?? 0;

  return (
    <section className="eleicao-admin-bloco" aria-labelledby="eleicao-contestacoes-titulo">
      <div className="eleicao-admin-bloco-cabecalho">
        <div>
          <h2 id="eleicao-contestacoes-titulo">Impugnações e recursos</h2>
          <p>
            Filiados podem contestar uma chapa em até 3 dias úteis após a homologação (Art. 38
            §13º/§18º/§19º). Deferir uma impugnação derruba a homologação; deferir um recurso
            homologa a chapa.
          </p>
        </div>
        {abertas > 0 && (
          <span className="badge badge-contestacao-aberta">
            {abertas} aguardando decisão
          </span>
        )}
      </div>

      {isLoading && <EstadoCarregando mensagem="Carregando contestações…" />}

      {contestacoes && contestacoes.length === 0 && (
        <div className="eleicao-admin-vazio">
          <p>Nenhuma contestação registrada nesta eleição.</p>
        </div>
      )}

      {contestacoes && contestacoes.length > 0 && (
        <ul className="eleicao-contestacoes">
          {contestacoes.map((contestacao) => {
            const chapa = chapas.find((item) => item.id === contestacao.chapaId);
            const decisao = decisoes[contestacao.id] ?? '';
            const podeDecidir = resolver.isPending || decisao.trim().length < 5;

            return (
              <li className="eleicao-contestacao" key={contestacao.id}>
                <div className="eleicao-contestacao-topo">
                  <div>
                    <strong>{rotuloTipoContestacao[contestacao.tipo]}</strong>
                    <span className="eleicao-contestacao-alvo">
                      {chapa ? `Chapa ${chapa.numero} — ${chapa.nome}` : 'Chapa removida'}
                    </span>
                    <time dateTime={contestacao.createdAt.toISOString()}>
                      Registrada em {formatarDataHora(contestacao.createdAt)}
                    </time>
                  </div>
                  <span className={`badge badge-contestacao-${contestacao.status.toLowerCase()}`}>
                    {rotuloStatusContestacao[contestacao.status]}
                  </span>
                </div>

                <p className="eleicao-contestacao-motivo">{contestacao.motivo}</p>

                {contestacao.status === 'ABERTA' ? (
                  <div className="eleicao-contestacao-decisao">
                    <label>
                      Decisão da Comissão
                      <textarea
                        rows={2}
                        value={decisao}
                        onChange={(evento) =>
                          setDecisoes((atual) => ({
                            ...atual,
                            [contestacao.id]: evento.target.value,
                          }))
                        }
                        placeholder="Fundamente a decisão (mínimo 5 caracteres)"
                      />
                    </label>
                    <div className="eleicao-contestacao-decisao-acoes">
                      <button
                        type="button"
                        className="botao-primario"
                        disabled={podeDecidir}
                        onClick={() =>
                          resolver.mutate({
                            contestacaoId: contestacao.id,
                            status: 'DEFERIDA',
                            decisao: decisao.trim(),
                          })
                        }
                      >
                        Deferir
                      </button>
                      <button
                        type="button"
                        className="botao-perigo"
                        disabled={podeDecidir}
                        onClick={() =>
                          resolver.mutate({
                            contestacaoId: contestacao.id,
                            status: 'INDEFERIDA',
                            decisao: decisao.trim(),
                          })
                        }
                      >
                        Indeferir
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="eleicao-contestacao-resolvida">
                    <strong>Decisão:</strong> {contestacao.decisao}
                    {contestacao.decididoEm && ` · ${formatarDataHora(contestacao.decididoEm)}`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
