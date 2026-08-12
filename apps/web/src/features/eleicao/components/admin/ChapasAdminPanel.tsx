import { useState } from 'react';
import type { Candidato, Chapa, EleicaoAdminDetalhe } from '@sindprf/types';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { useHomologarChapa, useRemoverCandidato, useRemoverChapa } from '../../hooks';
import { numeroCedula, rotuloStatusChapa } from '../../rotulos';
import { CandidatoFormModal } from './CandidatoFormModal';
import { ChapaFormModal } from './ChapaFormModal';

type ModalChapa = { modo: 'criar' } | { modo: 'editar'; chapa: Chapa } | null;

type ModalCandidato =
  | { modo: 'criar'; chapaId: string }
  | { modo: 'editar'; chapaId: string; candidato: Candidato }
  | null;

export function ChapasAdminPanel({ eleicao }: { eleicao: EleicaoAdminDetalhe }) {
  const homologar = useHomologarChapa(eleicao.id);
  const removerChapa = useRemoverChapa(eleicao.id);
  const removerCandidato = useRemoverCandidato(eleicao.id);
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const [modalChapa, setModalChapa] = useState<ModalChapa>(null);
  const [modalCandidato, setModalCandidato] = useState<ModalCandidato>(null);
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});

  const editavel = eleicao.status === 'AGENDADA';

  return (
    <section className="eleicao-admin-bloco" aria-labelledby="eleicao-chapas-titulo">
      <div className="eleicao-admin-bloco-cabecalho">
        <div>
          <h2 id="eleicao-chapas-titulo">Chapas</h2>
          <p>
            Inscrição, composição e homologação das chapas. Depois que a urna abre, a composição fica
            travada.
          </p>
        </div>
        {editavel && (
          <button
            type="button"
            className="botao-secundario"
            onClick={() => setModalChapa({ modo: 'criar' })}
          >
            Nova chapa
          </button>
        )}
      </div>

      {eleicao.chapas.length === 0 ? (
        <div className="eleicao-admin-vazio">
          <p>Nenhuma chapa cadastrada ainda. A eleição precisa de pelo menos uma para seguir.</p>
          {editavel && (
            <button
              type="button"
              className="botao-primario"
              onClick={() => setModalChapa({ modo: 'criar' })}
            >
              Cadastrar a primeira chapa
            </button>
          )}
        </div>
      ) : (
        <div className="chapas-grid">
          {eleicao.chapas.map((chapa) => (
            <article className="chapa-card" key={chapa.id}>
              <div className="chapa-card-cabecalho">
                <span className="chapa-card-numero" aria-hidden="true">
                  {numeroCedula(chapa.numero)}
                </span>
                <div className="chapa-card-identificacao">
                  <span className="chapa-card-rotulo">Chapa {chapa.numero}</span>
                  <strong className="chapa-card-nome">{chapa.nome}</strong>
                  {chapa.slogan && <p className="chapa-card-slogan">{chapa.slogan}</p>}
                </div>
                <span className={`badge badge-chapa-${chapa.status.toLowerCase()}`}>
                  {rotuloStatusChapa[chapa.status]}
                </span>
              </div>

              <div className="chapa-card-secao">
                <h3 className="chapa-card-secao-titulo">Candidatos</h3>
                {chapa.candidatos.length === 0 ? (
                  <p className="chapa-card-vazio">Nenhum candidato nesta chapa.</p>
                ) : (
                  <ul className="candidatos-lista">
                    {chapa.candidatos.map((candidato) => (
                      <li key={candidato.id}>
                        <span className="candidato-identificacao">
                          <span className="candidato-cargo">{candidato.cargo}</span>
                          <span className="candidato-nome">{candidato.nome}</span>
                        </span>
                        {editavel && (
                          <span className="tabela-acoes">
                            <button
                              type="button"
                              className="botao-link-acao"
                              onClick={() =>
                                setModalCandidato({ modo: 'editar', chapaId: chapa.id, candidato })
                              }
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="botao-link-acao"
                              onClick={() =>
                                pedirConfirmacao({
                                  titulo: 'Remover candidato?',
                                  descricao: `${candidato.nome} sai da chapa "${chapa.nome}".`,
                                  confirmarRotulo: 'Remover',
                                  onConfirmar: () =>
                                    removerCandidato.mutateAsync({
                                      chapaId: chapa.id,
                                      candidatoId: candidato.id,
                                    }),
                                })
                              }
                            >
                              Remover
                            </button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {editavel && (
                  <button
                    type="button"
                    className="botao-link-acao"
                    onClick={() => setModalCandidato({ modo: 'criar', chapaId: chapa.id })}
                  >
                    Adicionar candidato
                  </button>
                )}
              </div>

              {chapa.status === 'INSCRITA' && (
                <div className="chapa-card-homologacao">
                  <label>
                    Justificativa da decisão
                    <input
                      type="text"
                      value={justificativas[chapa.id] ?? ''}
                      onChange={(evento) =>
                        setJustificativas((atual) => ({
                          ...atual,
                          [chapa.id]: evento.target.value,
                        }))
                      }
                      placeholder="Motivo da homologação ou do indeferimento"
                    />
                  </label>
                  <div className="chapa-card-homologacao-acoes">
                    <button
                      type="button"
                      className="botao-primario"
                      disabled={homologar.isPending || !justificativas[chapa.id]?.trim()}
                      onClick={() =>
                        homologar.mutate({
                          chapaId: chapa.id,
                          status: 'HOMOLOGADA',
                          justificativa: justificativas[chapa.id]!.trim(),
                        })
                      }
                    >
                      Homologar
                    </button>
                    <button
                      type="button"
                      className="botao-perigo"
                      disabled={homologar.isPending || !justificativas[chapa.id]?.trim()}
                      onClick={() =>
                        homologar.mutate({
                          chapaId: chapa.id,
                          status: 'NAO_HOMOLOGADA',
                          justificativa: justificativas[chapa.id]!.trim(),
                        })
                      }
                    >
                      Não homologar
                    </button>
                  </div>
                  <p className="chapa-card-ajuda">
                    A decisão abre prazo de 3 dias úteis para impugnação ou recurso.
                  </p>
                </div>
              )}

              {chapa.status !== 'INSCRITA' && chapa.justificativaHomologacao && (
                <p className="chapa-card-justificativa">
                  Justificativa: {chapa.justificativaHomologacao}
                </p>
              )}

              {editavel && (
                <div className="chapa-card-rodape">
                  <button
                    type="button"
                    className="botao-link-acao"
                    onClick={() => setModalChapa({ modo: 'editar', chapa })}
                  >
                    Editar chapa
                  </button>
                  <button
                    type="button"
                    className="botao-link-acao botao-link-acao--perigo"
                    onClick={() =>
                      pedirConfirmacao({
                        titulo: 'Excluir chapa?',
                        descricao: `A chapa "${chapa.nome}" e seus candidatos serão removidos.`,
                        confirmarRotulo: 'Excluir',
                        onConfirmar: () => removerChapa.mutateAsync(chapa.id),
                      })
                    }
                  >
                    Excluir chapa
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <ChapaFormModal
        aberto={modalChapa !== null}
        eleicaoId={eleicao.id}
        chapa={modalChapa?.modo === 'editar' ? modalChapa.chapa : undefined}
        onFechar={() => setModalChapa(null)}
      />
      <CandidatoFormModal
        aberto={modalCandidato !== null}
        eleicaoId={eleicao.id}
        chapaId={modalCandidato?.chapaId ?? ''}
        candidato={modalCandidato?.modo === 'editar' ? modalCandidato.candidato : undefined}
        onFechar={() => setModalCandidato(null)}
      />
      {modalConfirmacao}
    </section>
  );
}
