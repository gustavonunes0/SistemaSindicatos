import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
      <AreaLayout tipo="admin" titulo="Eleição">
        <p className="erro">Não foi possível carregar esta eleição.</p>
      </AreaLayout>
    );
  }

  const chapasHomologadas = eleicao.chapas.filter((chapa) => chapa.status === 'HOMOLOGADA');
  const podeAclamacao = eleicao.status === 'AGENDADA' && chapasHomologadas.length === 1;

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
        eleicao.status === 'AGENDADA' && (
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
        )
      }
    >
      <section className="painel-secao">
        <div className="chapa-card-cabecalho">
          <span className={`badge badge-eleicao-${eleicao.status.toLowerCase()}`}>
            {rotuloStatus[eleicao.status]}
            {eleicao.resolvidaPorAclamacao ? ' (por aclamação)' : ''}
          </span>
          <span>
            {eleicao.totalComparecimentos} de {eleicao.totalElegiveis} elegíveis já votaram
          </span>
        </div>

        {erroAcao && <p className="erro">{erroAcao}</p>}

        <div className="form-linha">
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
                  onConfirmar: () => executarAcao(() => apurar.mutateAsync()),
                })
              }
            >
              Apurar votos
            </button>
          )}
        </div>

        {eleicao.status === 'APURADA' && resultado && (
          <div>
            <p className="dash-secao-ajuda">
              {resultado.porAclamacao
                ? 'Resultado por aclamação — sem escrutínio secreto.'
                : 'Apuração eletrônica — o resultado oficial soma os votos presenciais apurados pela Comissão Eleitoral.'}
            </p>
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
        )}
      </section>

      <section className="painel-secao">
        <div className="dash-secao-cabecalho">
          <h2 className="painel-secao-titulo">Chapas</h2>
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

        {eleicao.chapas.length === 0 && <p>Nenhuma chapa cadastrada ainda.</p>}

        <div className="chapas-grid">
          {eleicao.chapas.map((chapa) => (
            <article className="chapa-card" key={chapa.id}>
              <div className="chapa-card-cabecalho">
                <span className="chapa-card-numero">Chapa {chapa.numero}</span>
                <span className={`badge badge-chapa-${chapa.status.toLowerCase()}`}>
                  {rotuloChapaStatus[chapa.status]}
                </span>
              </div>
              <strong>{chapa.nome}</strong>
              {chapa.slogan && <p className="dash-secao-ajuda">{chapa.slogan}</p>}

              <ul className="candidatos-lista">
                {chapa.candidatos.map((candidato) => (
                  <li key={candidato.id}>
                    <span>
                      {candidato.nome} <span className="candidato-cargo">— {candidato.cargo}</span>
                    </span>
                    {eleicao.status === 'AGENDADA' && (
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
                          className="botao-link"
                          onClick={() =>
                            removerCandidato.mutate({ chapaId: chapa.id, candidatoId: candidato.id })
                          }
                        >
                          Remover
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {eleicao.status === 'AGENDADA' && (
                <button
                  type="button"
                  className="botao-link-acao"
                  onClick={() => setModalCandidato({ modo: 'criar', chapaId: chapa.id })}
                >
                  + Candidato
                </button>
              )}

              {chapa.status === 'INSCRITA' && (
                <div className="form-linha">
                  <label>
                    Justificativa
                    <input
                      type="text"
                      value={justificativas[chapa.id] ?? ''}
                      onChange={(evento) =>
                        setJustificativas((atual) => ({
                          ...atual,
                          [chapa.id]: evento.target.value,
                        }))
                      }
                      placeholder="Motivo da decisão"
                    />
                  </label>
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
              )}

              {chapa.status !== 'INSCRITA' && chapa.justificativaHomologacao && (
                <p className="dash-secao-ajuda">Justificativa: {chapa.justificativaHomologacao}</p>
              )}

              {eleicao.status === 'AGENDADA' && (
                <div className="tabela-acoes">
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

      <ElegiveisAdminPanel eleicaoId={eleicaoId} />
      <ContestacoesAdminPanel eleicaoId={eleicaoId} />
      <ComissaoEleitoralPanel eleicaoId={eleicaoId} />

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
