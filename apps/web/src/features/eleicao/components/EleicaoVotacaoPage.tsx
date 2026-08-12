import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Chapa } from '@sindprf/types';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { ConfirmacaoModal } from '../../../components/ui/ConfirmacaoModal';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../lib/datas';
import { useEleicao, useMeuStatusVotacao, useVotar } from '../hooks';
import { numeroCedula, rotuloStatusChapa, rotuloStatusEleicao } from '../rotulos';
import { ContestarChapaModal } from './ContestarChapaModal';

type AlvoContestacao = {
  chapaId: string;
  nome: string;
  tipo: 'IMPUGNACAO' | 'RECURSO';
};

export function EleicaoVotacaoPage() {
  const { id = '' } = useParams();
  const { data: eleicao, isLoading, isError } = useEleicao(id);
  const { data: meuStatus, isLoading: carregandoStatus } = useMeuStatusVotacao(id);
  const votar = useVotar(id);

  const [chapaSelecionada, setChapaSelecionada] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [contestacao, setContestacao] = useState<AlvoContestacao | null>(null);

  if (isLoading || carregandoStatus) {
    return (
      <AreaLayout tipo="afiliado" titulo="Votação">
        <EstadoCarregando mensagem="Carregando eleição…" />
      </AreaLayout>
    );
  }

  if (isError || !eleicao || !meuStatus) {
    return (
      <AreaLayout
        tipo="afiliado"
        titulo="Votação"
        acoes={
          <Link to="/afiliado/eleicoes" className="botao-link-acao">
            ← Eleições
          </Link>
        }
      >
        <p className="erro">Não foi possível carregar esta eleição. Tente novamente em instantes.</p>
      </AreaLayout>
    );
  }

  const chapasHomologadas = eleicao.chapas.filter((chapa) => chapa.status === 'HOMOLOGADA');
  const votacaoLiberada = meuStatus.elegivel && !meuStatus.jaVotou && eleicao.status === 'ABERTA';
  const chapaEscolhida = chapasHomologadas.find((chapa) => chapa.id === chapaSelecionada);

  const confirmarVoto = () => {
    if (!chapaSelecionada) return;
    votar.mutate(chapaSelecionada, { onSuccess: () => setConfirmando(false) });
  };

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={eleicao.titulo}
      acoes={
        <Link to="/afiliado/eleicoes" className="botao-link-acao">
          ← Eleições
        </Link>
      }
    >
      <section className="voto-situacao">
        <span className={`badge badge-eleicao-${eleicao.status.toLowerCase()}`}>
          {eleicao.resolvidaPorAclamacao ? 'Eleita por aclamação' : rotuloStatusEleicao[eleicao.status]}
        </span>
        <p className="voto-situacao-janela">
          Urna eletrônica de {formatarDataHora(eleicao.inicio)} até {formatarDataHora(eleicao.fim)}
        </p>
        {eleicao.status === 'APURADA' && (
          <Link to={`/afiliado/eleicoes/${id}/resultado`} className="botao-secundario">
            Ver resultado
          </Link>
        )}
      </section>

      {!meuStatus.elegivel && (
        <PainelAviso
          tom="bloqueado"
          titulo="Você não vota pela urna eletrônica nesta eleição"
          texto="Seu nome não consta na lista de eleitores do voto eletrônico. Se você aderiu a essa modalidade, procure a Comissão Eleitoral para conferir a lista."
        />
      )}

      {meuStatus.elegivel && meuStatus.jaVotou && (
        <Comprovante protocolo={meuStatus.protocolo} votouEm={meuStatus.votouEm} />
      )}

      {meuStatus.elegivel && !meuStatus.jaVotou && eleicao.status === 'AGENDADA' && (
        <PainelAviso
          tom="espera"
          titulo="A urna ainda não abriu"
          texto={`A votação começa em ${formatarDataHora(eleicao.inicio)}. Aproveite para conferir as chapas abaixo.`}
        />
      )}

      {meuStatus.elegivel && !meuStatus.jaVotou && eleicao.status === 'ENCERRADA' && (
        <PainelAviso
          tom="espera"
          titulo="A votação foi encerrada"
          texto="A Comissão Eleitoral está apurando os votos. O resultado aparece aqui assim que for proclamado."
        />
      )}

      {meuStatus.elegivel && !meuStatus.jaVotou && eleicao.status === 'APURADA' && (
        <PainelAviso
          tom="espera"
          titulo="Esta eleição já foi apurada"
          texto="O período de votação terminou e o resultado já está disponível."
        />
      )}

      {votacaoLiberada && (
        <>
          <section className="voto-cedula" aria-labelledby="voto-cedula-titulo">
            <header className="voto-cedula-cabecalho">
              <p className="eyebrow">Cédula eletrônica</p>
              <h2 id="voto-cedula-titulo">Escolha uma chapa</h2>
              <p className="voto-cedula-texto">
                Toque na chapa desejada e confirme. O voto é secreto e definitivo — ninguém, nem a
                Comissão Eleitoral, consegue saber em quem você votou.
              </p>
            </header>

            {chapasHomologadas.length === 0 ? (
              <p className="voto-cedula-vazio">
                Nenhuma chapa homologada nesta eleição. Procure a Comissão Eleitoral.
              </p>
            ) : (
              <div className="voto-chapas" role="radiogroup" aria-labelledby="voto-cedula-titulo">
                {chapasHomologadas.map((chapa) => {
                  const selecionada = chapaSelecionada === chapa.id;
                  return (
                    <button
                      key={chapa.id}
                      type="button"
                      role="radio"
                      aria-checked={selecionada}
                      className={`voto-chapa ${selecionada ? 'voto-chapa--selecionada' : ''}`}
                      onClick={() => setChapaSelecionada(chapa.id)}
                    >
                      <span className="voto-chapa-numero" aria-hidden="true">
                        {numeroCedula(chapa.numero)}
                      </span>
                      <span className="voto-chapa-corpo">
                        <span className="voto-chapa-rotulo">Chapa {chapa.numero}</span>
                        <strong className="voto-chapa-nome">{chapa.nome}</strong>
                        {chapa.slogan && <span className="voto-chapa-slogan">{chapa.slogan}</span>}
                        <ListaCandidatos chapa={chapa} />
                      </span>
                      <span className="voto-chapa-marca" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <div className="voto-barra">
            <p className="voto-barra-escolha">
              {chapaEscolhida ? (
                <>
                  <span>Sua escolha</span>
                  <strong>
                    Chapa {chapaEscolhida.numero} — {chapaEscolhida.nome}
                  </strong>
                </>
              ) : (
                <span>Selecione uma chapa para liberar a confirmação</span>
              )}
            </p>
            <button
              type="button"
              className="botao-primario"
              disabled={!chapaSelecionada}
              onClick={() => setConfirmando(true)}
            >
              Confirmar voto
            </button>
          </div>

          {votar.isError && (
            <p className="erro">
              Não foi possível registrar seu voto. Recarregue a página e tente novamente; se persistir,
              procure a Comissão Eleitoral.
            </p>
          )}

          <ConfirmacaoModal
            aberto={confirmando}
            titulo={
              chapaEscolhida
                ? `Confirmar voto na Chapa ${chapaEscolhida.numero} — ${chapaEscolhida.nome}?`
                : 'Confirmar voto?'
            }
            descricao="Depois de confirmar não é possível votar de novo nem alterar a escolha. Seu voto continua secreto."
            confirmarRotulo="Confirmar voto"
            tom="primario"
            carregando={votar.isPending}
            onConfirmar={confirmarVoto}
            onCancelar={() => setConfirmando(false)}
          />
        </>
      )}

      {!votacaoLiberada && eleicao.chapas.length > 0 && (
        <section className="voto-chapas-info" aria-labelledby="voto-chapas-info-titulo">
          <h2 id="voto-chapas-info-titulo">Chapas concorrentes</h2>
          <ul className="voto-chapas">
            {eleicao.chapas.map((chapa) => {
              const prazoAberto =
                chapa.status !== 'INSCRITA' &&
                chapa.prazoContestacaoFim !== null &&
                new Date() <= chapa.prazoContestacaoFim;
              return (
                <li key={chapa.id}>
                  <article className="voto-chapa voto-chapa--info">
                    <span className="voto-chapa-numero" aria-hidden="true">
                      {numeroCedula(chapa.numero)}
                    </span>
                    <div className="voto-chapa-corpo">
                      <span className="voto-chapa-rotulo">
                        Chapa {chapa.numero} ·{' '}
                        <span className={`badge badge-chapa-${chapa.status.toLowerCase()}`}>
                          {rotuloStatusChapa[chapa.status]}
                        </span>
                      </span>
                      <strong className="voto-chapa-nome">{chapa.nome}</strong>
                      {chapa.slogan && <span className="voto-chapa-slogan">{chapa.slogan}</span>}
                      <ListaCandidatos chapa={chapa} comoLista />
                      {prazoAberto && (
                        <button
                          type="button"
                          className="botao-link-acao voto-chapa-contestar"
                          onClick={() =>
                            setContestacao({
                              chapaId: chapa.id,
                              nome: chapa.nome,
                              tipo: chapa.status === 'HOMOLOGADA' ? 'IMPUGNACAO' : 'RECURSO',
                            })
                          }
                        >
                          {chapa.status === 'HOMOLOGADA'
                            ? 'Impugnar esta chapa'
                            : 'Recorrer da não homologação'}
                        </button>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {contestacao && (
        <ContestarChapaModal
          aberto
          eleicaoId={id}
          chapaId={contestacao.chapaId}
          chapaNome={contestacao.nome}
          tipoProvavel={contestacao.tipo}
          onFechar={() => setContestacao(null)}
        />
      )}
    </AreaLayout>
  );
}

/**
 * Dentro da cédula os candidatos vivem num `<button>`, que só aceita conteúdo
 * de frase — daí a versão em `<span>`. Fora dela, usa lista de verdade.
 */
function ListaCandidatos({ chapa, comoLista }: { chapa: Chapa; comoLista?: boolean }) {
  if (chapa.candidatos.length === 0) return null;
  const Lista = comoLista ? 'ul' : 'span';
  const Item = comoLista ? 'li' : 'span';
  return (
    <Lista className="voto-chapa-candidatos">
      {chapa.candidatos.map((candidato) => (
        <Item key={candidato.id}>
          <span className="voto-chapa-candidato-cargo">{candidato.cargo}</span>
          <span className="voto-chapa-candidato-nome">{candidato.nome}</span>
        </Item>
      ))}
    </Lista>
  );
}

type PainelAvisoProps = {
  tom: 'bloqueado' | 'espera';
  titulo: string;
  texto: string;
};

function PainelAviso({ tom, titulo, texto }: PainelAvisoProps) {
  return (
    <section className={`voto-aviso voto-aviso--${tom}`}>
      <h2 className="voto-aviso-titulo">{titulo}</h2>
      <p className="voto-aviso-texto">{texto}</p>
    </section>
  );
}

function Comprovante({ protocolo, votouEm }: { protocolo: string | null; votouEm: Date | null }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!protocolo || !navigator.clipboard) return;
    await navigator.clipboard.writeText(protocolo);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <section className="voto-comprovante" aria-labelledby="voto-comprovante-titulo">
      <p className="eyebrow">Comprovante de votação</p>
      <h2 id="voto-comprovante-titulo">Seu voto foi registrado</h2>
      {votouEm && <p className="voto-comprovante-data">Registrado em {formatarDataHora(votouEm)}</p>}
      {protocolo && (
        <div className="voto-comprovante-protocolo">
          <span className="voto-comprovante-protocolo-rotulo">Protocolo</span>
          <code>{protocolo}</code>
          {navigator.clipboard && (
            <button type="button" className="botao-secundario" onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          )}
        </div>
      )}
      <p className="voto-comprovante-ajuda">
        O protocolo comprova que você votou e não revela sua escolha. Guarde-o para eventual
        conferência junto à Comissão Eleitoral.
      </p>
    </section>
  );
}
