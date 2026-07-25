import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarDataHora } from '../../../../lib/datas';
import {
  useAbrirEleicao,
  useApurarEleicao,
  useEleicaoAdmin,
  useEncerrarEleicao,
  useHomologarChapa,
  useRemoverCandidato,
  useRemoverChapa,
  useRemoverEleicao,
  useResolverAclamacao,
  useResultado,
} from '../../hooks';
import { CandidatoFormModal } from './CandidatoFormModal';
import { ChapaFormModal } from './ChapaFormModal';
import { ComissaoEleitoralPanel } from './ComissaoEleitoralPanel';
import { ContestacoesAdminPanel } from './ContestacoesAdminPanel';
import { ElegiveisAdminPanel } from './ElegiveisAdminPanel';
import { EleicaoFormModal } from './EleicaoFormModal';

const rotuloStatus = {
  AGENDADA: 'Agendada',
  ABERTA: 'Aberta',
  ENCERRADA: 'Encerrada',
  APURADA: 'Apurada',
} as const;

const rotuloChapaStatus = {
  INSCRITA: 'Aguardando homologação',
  HOMOLOGADA: 'Homologada',
  NAO_HOMOLOGADA: 'Não homologada',
} as const;

const fases = [
  { id: 'AGENDADA', rotulo: 'Preparação' },
  { id: 'ABERTA', rotulo: 'Votação' },
  { id: 'ENCERRADA', rotulo: 'Encerrada' },
  { id: 'APURADA', rotulo: 'Apurada' },
] as const;

type ModalChapa =
  | { modo: 'criar' }
  | { modo: 'editar'; chapa: import('@sindprf/types').Chapa }
  | null;

type ModalCandidato =
  | { modo: 'criar'; chapaId: string }
  | { modo: 'editar'; chapaId: string; candidato: import('@sindprf/types').Candidato }
  | null;

export function EleicaoDetalheAdminPage() {
  const { id } = useParams<{ id: string }>();
  const eleicaoId = id!;
  const navigate = useNavigate();
  const { data: eleicao, isLoading, isError } = useEleicaoAdmin(eleicaoId);
  const abrir = useAbrirEleicao(eleicaoId);
  const encerrar = useEncerrarEleicao(eleicaoId);
  const apurar = useApurarEleicao(eleicaoId);
  const aclamacao = useResolverAclamacao(eleicaoId);
  const removerEleicao = useRemoverEleicao();
  const homologar = useHomologarChapa(eleicaoId);
  const removerChapa = useRemoverChapa(eleicaoId);
  const removerCandidato = useRemoverCandidato(eleicaoId);
  const { data: resultado } = useResultado(eleicaoId, eleicao?.status === 'APURADA');
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const [modalEleicao, setModalEleicao] = useState(false);
  const [modalChapa, setModalChapa] = useState<ModalChapa>(null);
  const [modalCandidato, setModalCandidato] = useState<ModalCandidato>(null);
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  if (isLoading) {
    return (
      <AreaLayout tipo="admin" titulo="Eleição">
        <EstadoCarregando mensagem="Carregando eleição…" />
      </AreaLayout>
    );
  }

  if (isError || !eleicao) {
    return (
      <AreaLayout tipo="admin" titulo="Eleição" acoes={<Link to="/admin/eleicoes">← Eleições</Link>}>
        <p className="erro">Não foi possível carregar esta eleição.</p>
      </AreaLayout>
    );
  }

  const chapasHomologadas = eleicao.chapas.filter((chapa) => chapa.status === 'HOMOLOGADA');
  const chapasPendentes = eleicao.chapas.filter((chapa) => chapa.status === 'INSCRITA').length;
  const podeAclamacao = eleicao.status === 'AGENDADA' && chapasHomologadas.length === 1;
  const percentualComparecimento =
    eleicao.totalElegiveis > 0
      ? Math.min(100, Math.round((eleicao.totalComparecimentos / eleicao.totalElegiveis) * 100))
      : 0;
  const indiceFase = fases.findIndex((fase) => fase.id === eleicao.status);

  const executarAcao = async (acao: () => Promise<unknown>) => {
    setErroAcao(null);
    try {
      await acao();
    } catch {
      setErroAcao(
        'Não foi possível concluir a ação. Verifique se todas as chapas foram homologadas e se não há contestações em aberto.',
      );
    }
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo={eleicao.titulo}
      descricao={`${formatarDataHora(eleicao.inicio)} até ${formatarDataHora(eleicao.fim)}`}
      acoes={
        <>
          <Link to="/admin/eleicoes" className="botao-link-acao">
            ← Eleições
          </Link>
          {eleicao.status === 'AGENDADA' && (
            <>
              <button type="button" className="botao-secundario" onClick={() => setModalEleicao(true)}>
                Editar
              </button>
              <button
                type="button"
                className="botao-perigo"
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Excluir eleição?',
                    descricao: `A eleição "${eleicao.titulo}" e suas chapas serão removidas permanentemente.`,
                    confirmarRotulo: 'Excluir',
                    onConfirmar: async () => {
                      await removerEleicao.mutateAsync(eleicaoId);
                      navigate('/admin/eleicoes');
                    },
                  })
                }
              >
                Excluir
              </button>
            </>
          )}
        </>
      }
    >
      <section className="eleicao-admin-status" aria-label="Situação da eleição">
        <ol className="eleicao-admin-fases">
          {fases.map((fase, indice) => {
            const estado =
              indice < indiceFase ? 'concluida' : indice === indiceFase ? 'atual' : 'pendente';
            return (
              <li key={fase.id} className={`eleicao-admin-fase eleicao-admin-fase--${estado}`}>
                <span className="eleicao-admin-fase-marca" aria-hidden="true" />
                <span className="eleicao-admin-fase-rotulo">{fase.rotulo}</span>
              </li>
            );
          })}
        </ol>

        <div className="eleicao-admin-metricas">
          <div className="eleicao-admin-metrica">
            <span className="eleicao-admin-metrica-rotulo">Status</span>
            <span className={`badge badge-eleicao-${eleicao.status.toLowerCase()}`}>
              {rotuloStatus[eleicao.status]}
              {eleicao.resolvidaPorAclamacao ? ' · aclamação' : ''}
            </span>
          </div>
          <div className="eleicao-admin-metrica">
            <span className="eleicao-admin-metrica-rotulo">Chapas</span>
            <strong>
              {chapasHomologadas.length} homologada{chapasHomologadas.length === 1 ? '' : 's'}
              {chapasPendentes > 0 ? ` · ${chapasPendentes} pendente${chapasPendentes === 1 ? '' : 's'}` : ''}
            </strong>
          </div>
          <div className="eleicao-admin-metrica eleicao-admin-metrica--larga">
            <div className="eleicao-admin-metrica-topo">
              <span className="eleicao-admin-metrica-rotulo">Comparecimento eletrônico</span>
              <strong>
                {eleicao.totalComparecimentos} de {eleicao.totalElegiveis} ({percentualComparecimento}%)
              </strong>
            </div>
            <div
              className="eleicao-admin-progresso"
              role="progressbar"
              aria-valuenow={percentualComparecimento}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Comparecimento eletrônico"
            >
              <span style={{ width: `${percentualComparecimento}%` }} />
            </div>
          </div>
        </div>
      </section>

      {(eleicao.status === 'AGENDADA' ||
        eleicao.status === 'ABERTA' ||
        eleicao.status === 'ENCERRADA') && (
        <section className="eleicao-admin-acoes" aria-labelledby="eleicao-acoes-titulo">
          <div className="eleicao-admin-acoes-cabecalho">
            <h2 id="eleicao-acoes-titulo">Ação desta fase</h2>
            <p>
              {eleicao.status === 'AGENDADA' &&
                'Homologue as chapas e confirme a lista de elegíveis antes de abrir a votação.'}
              {eleicao.status === 'ABERTA' &&
                'A votação eletrônica está liberada para afiliados elegíveis.'}
              {eleicao.status === 'ENCERRADA' &&
                'As urnas eletrônicas estão fechadas. Apure os votos quando a Comissão estiver pronta.'}
            </p>
          </div>

          {erroAcao && <p className="erro">{erroAcao}</p>}

          <div className="eleicao-admin-acoes-botoes">
            {eleicao.status === 'AGENDADA' && (
              <button
                type="button"
                className="botao-primario"
                disabled={abrir.isPending}
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Abrir votação?',
                    descricao:
                      'A partir de agora, afiliados elegíveis poderão votar. Confirme que todas as chapas foram homologadas.',
                    confirmarRotulo: 'Abrir votação',
                    tom: 'primario',
                    onConfirmar: () => executarAcao(() => abrir.mutateAsync()),
                  })
                }
              >
                Abrir votação
              </button>
            )}

            {podeAclamacao && (
              <button
                type="button"
                className="botao-secundario"
                disabled={aclamacao.isPending}
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Resolver por aclamação?',
                    descricao: `Só há uma chapa homologada (${chapasHomologadas[0]!.nome}). Ela será declarada eleita por aclamação, sem votação secreta (Art. 38 do Estatuto).`,
                    confirmarRotulo: 'Resolver por aclamação',
                    tom: 'primario',
                    onConfirmar: () =>
                      executarAcao(() => aclamacao.mutateAsync(chapasHomologadas[0]!.id)),
                  })
                }
              >
                Resolver por aclamação
              </button>
            )}

            {eleicao.status === 'ABERTA' && (
              <button
                type="button"
                className="botao-primario"
                disabled={encerrar.isPending}
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Encerrar votação?',
                    descricao: 'Nenhum afiliado poderá votar depois disso.',
                    confirmarRotulo: 'Encerrar',
                    onConfirmar: () => executarAcao(() => encerrar.mutateAsync()),
                  })
                }
              >
                Encerrar votação
              </button>
            )}

            {eleicao.status === 'ENCERRADA' && (
              <button
                type="button"
                className="botao-primario"
                disabled={apurar.isPending}
                onClick={() =>
                  pedirConfirmacao({
                    titulo: 'Apurar votos?',
                    descricao:
                      'Conta os votos eletrônicos por chapa. Some manualmente com os votos presenciais para a proclamação oficial.',
                    confirmarRotulo: 'Apurar',
                    tom: 'primario',
                    onConfirmar: () => executarAcao(() => apurar.mutateAsync()),
                  })
                }
              >
                Apurar votos
              </button>
            )}
          </div>
        </section>
      )}

      {eleicao.status === 'APURADA' && resultado && (
        <section className="eleicao-admin-resultado" aria-labelledby="eleicao-resultado-titulo">
          <div className="eleicao-admin-acoes-cabecalho">
            <h2 id="eleicao-resultado-titulo">Resultado eletrônico</h2>
            <p>
              {resultado.porAclamacao
                ? 'Resultado por aclamação — sem escrutínio secreto.'
                : 'Apuração eletrônica — o resultado oficial soma os votos presenciais apurados pela Comissão Eleitoral.'}
            </p>
          </div>
          <div className="eleicao-admin-resultado-lista">
            {resultado.resultados.map((item) => (
              <div className="resultado-linha" key={item.chapaId}>
                <div className="resultado-linha-topo">
                  <span>
                    Chapa {item.numero} — {item.nome}
                  </span>
                  <span>
                    {item.totalVotos} votos ({item.percentual.toFixed(1)}%)
                  </span>
                </div>
                <div className="resultado-barra-trilho">
                  <div
                    className="resultado-barra-preenchimento"
                    style={{ width: `${item.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="eleicao-admin-bloco" aria-labelledby="eleicao-chapas-titulo">
        <div className="eleicao-admin-bloco-cabecalho">
          <div>
            <h2 id="eleicao-chapas-titulo">Chapas</h2>
            <p>Inscrição, composição e homologação das chapas concorrentes.</p>
          </div>
          {eleicao.status === 'AGENDADA' && (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setModalChapa({ modo: 'criar' })}
            >
              Nova chapa
            </button>
          )}
        </div>

        {eleicao.chapas.length === 0 && (
          <div className="eleicao-admin-vazio">
            <p>Nenhuma chapa cadastrada ainda.</p>
            {eleicao.status === 'AGENDADA' && (
              <button
                type="button"
                className="botao-primario"
                onClick={() => setModalChapa({ modo: 'criar' })}
              >
                Cadastrar a primeira chapa
              </button>
            )}
          </div>
        )}

        <div className="chapas-grid">
          {eleicao.chapas.map((chapa) => (
            <article className="chapa-card chapa-card--admin" key={chapa.id}>
              <div className="chapa-card-cabecalho">
                <span className="chapa-card-numero">Chapa {chapa.numero}</span>
                <span className={`badge badge-chapa-${chapa.status.toLowerCase()}`}>
                  {rotuloChapaStatus[chapa.status]}
                </span>
              </div>
              <strong className="chapa-card-nome">{chapa.nome}</strong>
              {chapa.slogan && <p className="chapa-card-slogan">{chapa.slogan}</p>}

              <div className="chapa-card-secao">
                <h3 className="chapa-card-secao-titulo">Candidatos</h3>
                {chapa.candidatos.length === 0 ? (
                  <p className="chapa-card-vazio">Nenhum candidato nesta chapa.</p>
                ) : (
                  <ul className="candidatos-lista">
                    {chapa.candidatos.map((candidato) => (
                      <li key={candidato.id}>
                        <span>
                          {candidato.nome}{' '}
                          <span className="candidato-cargo">— {candidato.cargo}</span>
                        </span>
                        {eleicao.status === 'AGENDADA' && (
                          <span className="tabela-acoes">
                            <button
                              type="button"
                              className="botao-link-acao"
                              onClick={() =>
                                setModalCandidato({
                                  modo: 'editar',
                                  chapaId: chapa.id,
                                  candidato,
                                })
                              }
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="botao-link"
                              onClick={() =>
                                removerCandidato.mutate({
                                  chapaId: chapa.id,
                                  candidatoId: candidato.id,
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
                {eleicao.status === 'AGENDADA' && (
                  <button
                    type="button"
                    className="botao-link-acao"
                    onClick={() => setModalCandidato({ modo: 'criar', chapaId: chapa.id })}
                  >
                    + Candidato
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
                      placeholder="Motivo da homologação ou indeferimento"
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
                </div>
              )}

              {chapa.status !== 'INSCRITA' && chapa.justificativaHomologacao && (
                <p className="chapa-card-justificativa">
                  Justificativa: {chapa.justificativaHomologacao}
                </p>
              )}

              {eleicao.status === 'AGENDADA' && (
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
                    className="botao-perigo"
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
      </section>

      <div className="eleicao-admin-paineis">
        <ElegiveisAdminPanel eleicaoId={eleicaoId} />
        <ContestacoesAdminPanel eleicaoId={eleicaoId} />
        <ComissaoEleitoralPanel eleicaoId={eleicaoId} />
      </div>

      <EleicaoFormModal
        aberto={modalEleicao}
        id={eleicaoId}
        onFechar={() => setModalEleicao(false)}
      />
      <ChapaFormModal
        aberto={modalChapa !== null}
        eleicaoId={eleicaoId}
        chapa={modalChapa?.modo === 'editar' ? modalChapa.chapa : undefined}
        onFechar={() => setModalChapa(null)}
      />
      <CandidatoFormModal
        aberto={modalCandidato !== null}
        eleicaoId={eleicaoId}
        chapaId={modalCandidato?.chapaId ?? ''}
        candidato={modalCandidato?.modo === 'editar' ? modalCandidato.candidato : undefined}
        onFechar={() => setModalCandidato(null)}
      />
      {modalConfirmacao}
    </AreaLayout>
  );
}
