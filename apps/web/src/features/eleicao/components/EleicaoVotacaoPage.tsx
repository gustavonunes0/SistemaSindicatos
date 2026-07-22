import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { ConfirmacaoModal } from '../../../components/ui/ConfirmacaoModal';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../lib/datas';
import { useEleicao, useMeuStatusVotacao, useVotar } from '../hooks';
import { ContestarChapaModal } from './ContestarChapaModal';

export function EleicaoVotacaoPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: eleicao, isLoading, isError } = useEleicao(id);
  const { data: meuStatus, isLoading: carregandoStatus } = useMeuStatusVotacao(id);
  const votar = useVotar(id);

  const [chapaSelecionada, setChapaSelecionada] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [contestacao, setContestacao] = useState<{
    chapaId: string;
    nome: string;
    tipo: 'IMPUGNACAO' | 'RECURSO';
  } | null>(null);

  if (isLoading || carregandoStatus) {
    return (
      <AreaLayout tipo="afiliado" titulo="Votação">
        <EstadoCarregando mensagem="Carregando eleição…" />
      </AreaLayout>
    );
  }

  if (isError || !eleicao || !meuStatus) {
    return (
      <AreaLayout tipo="afiliado" titulo="Votação">
        <p className="erro">Não foi possível carregar esta eleição.</p>
      </AreaLayout>
    );
  }

  const chapaEscolhida = eleicao.chapas.find((chapa) => chapa.id === chapaSelecionada);

  const onConfirmarVoto = () => {
    if (!chapaSelecionada) return;
    votar.mutate(chapaSelecionada, {
      onSuccess: () => setConfirmando(false),
    });
  };

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={eleicao.titulo}
      descricao={`Votação de ${formatarDataHora(eleicao.inicio)} até ${formatarDataHora(eleicao.fim)}`}
      acoes={<Link to="/afiliado/eleicoes">← Eleições</Link>}
    >
      {!meuStatus.elegivel && (
        <div className="estado-vazio">
          <p>Você não está na lista de eleitores elegíveis para o voto eletrônico nesta eleição.</p>
          <p className="dash-secao-ajuda">
            Se você optou pelo voto eletrônico e acredita que isso é um engano, procure a
            Comissão Eleitoral.
          </p>
        </div>
      )}

      {meuStatus.elegivel && meuStatus.jaVotou && (
        <div className="estado-vazio">
          <p>Seu voto foi registrado com sucesso.</p>
          <p>
            Protocolo: <strong>{meuStatus.protocolo}</strong>
          </p>
          <p className="dash-secao-ajuda">
            O protocolo comprova que você votou, sem revelar sua escolha. Guarde-o para eventual
            conferência.
          </p>
        </div>
      )}

      {meuStatus.elegivel && !meuStatus.jaVotou && eleicao.status !== 'ABERTA' && (
        <div className="estado-vazio">
          <p>
            {eleicao.status === 'AGENDADA'
              ? 'A votação ainda não foi aberta.'
              : 'A votação já foi encerrada.'}
          </p>
        </div>
      )}

      {meuStatus.elegivel && !meuStatus.jaVotou && eleicao.status === 'ABERTA' && (
        <>
          <p>Selecione uma chapa e confirme seu voto. Esta ação é definitiva e sigilosa.</p>
          <div className="chapas-grid">
            {eleicao.chapas
              .filter((chapa) => chapa.status !== 'NAO_HOMOLOGADA')
              .map((chapa) => (
                <button
                  key={chapa.id}
                  type="button"
                  className={`chapa-card chapa-card--selecionavel ${chapaSelecionada === chapa.id ? 'chapa-card--selecionada' : ''}`}
                  onClick={() => setChapaSelecionada(chapa.id)}
                >
                  <div className="chapa-card-cabecalho">
                    <span className="chapa-card-numero">Chapa {chapa.numero}</span>
                  </div>
                  <strong>{chapa.nome}</strong>
                  {chapa.slogan && <p className="dash-secao-ajuda">{chapa.slogan}</p>}
                  <ul className="candidatos-lista">
                    {chapa.candidatos.map((candidato) => (
                      <li key={candidato.id}>
                        <span>{candidato.nome}</span>
                        <span className="candidato-cargo">{candidato.cargo}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
          </div>

          <div className="form-acoes">
            <button
              type="button"
              className="botao-primario"
              disabled={!chapaSelecionada}
              onClick={() => setConfirmando(true)}
            >
              Confirmar voto
            </button>
          </div>

          <ConfirmacaoModal
            aberto={confirmando}
            titulo={`Confirmar voto na Chapa ${chapaEscolhida?.numero} — ${chapaEscolhida?.nome}?`}
            descricao="Esta ação é definitiva e seu voto é sigiloso — não é possível saber depois em quem você votou."
            confirmarRotulo="Confirmar voto"
            tom="primario"
            carregando={votar.isPending}
            onConfirmar={onConfirmarVoto}
            onCancelar={() => setConfirmando(false)}
          />
          {votar.isError && <p className="erro">Não foi possível registrar seu voto.</p>}
        </>
      )}

      <section className="painel-secao">
        <h2 className="painel-secao-titulo">Chapas inscritas</h2>
        <div className="chapas-grid">
          {eleicao.chapas.map((chapa) => (
            <article className="chapa-card" key={`info-${chapa.id}`}>
              <div className="chapa-card-cabecalho">
                <span className="chapa-card-numero">Chapa {chapa.numero}</span>
                <span className={`badge badge-chapa-${chapa.status.toLowerCase()}`}>
                  {chapa.status === 'NAO_HOMOLOGADA' ? 'Não homologada' : chapa.status}
                </span>
              </div>
              <strong>{chapa.nome}</strong>
              {chapa.status !== 'INSCRITA' &&
                chapa.prazoContestacaoFim &&
                new Date() <= chapa.prazoContestacaoFim && (
                  <button
                    type="button"
                    className="botao-link-acao"
                    onClick={() =>
                      setContestacao({
                        chapaId: chapa.id,
                        nome: chapa.nome,
                        tipo: chapa.status === 'HOMOLOGADA' ? 'IMPUGNACAO' : 'RECURSO',
                      })
                    }
                  >
                    {chapa.status === 'HOMOLOGADA' ? 'Impugnar esta chapa' : 'Recorrer'}
                  </button>
                )}
            </article>
          ))}
        </div>
      </section>

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

      {eleicao.status === 'APURADA' && (
        <button
          type="button"
          className="botao-secundario"
          onClick={() => navigate(`/afiliado/eleicoes/${id}/resultado`)}
        >
          Ver resultado
        </button>
      )}
    </AreaLayout>
  );
}
