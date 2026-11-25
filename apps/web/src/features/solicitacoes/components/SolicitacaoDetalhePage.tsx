import {
  PERFIL_HOSPEDAGEM_PEDIDO_ROTULO,
  type StatusSolicitacao,
} from '@sindprf/types';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../hooks/useConfirmacao';
import { formatarData } from '../../../lib/datas';
import {
  useAprovarSolicitacao,
  useAtualizarStatusSolicitacao,
  useRecusarSolicitacao,
  useSolicitacao,
} from '../hooks';
import { rotuloStatusSolicitacao } from '../status';
import { ChatSolicitacao } from './ChatSolicitacao';
import { StatusSolicitacaoBadge } from './SolicitacaoShared';

type SolicitacaoDetalhePageProps = {
  visao: 'admin' | 'afiliado';
};

function mensagemErro(erro: unknown): string {
  if (isAxiosError(erro)) {
    const data = erro.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(' ');
    if (typeof data?.message === 'string') return data.message;
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export function SolicitacaoDetalhePage({ visao }: SolicitacaoDetalhePageProps) {
  const { id = '' } = useParams();
  const { data: solicitacao, isLoading, isError } = useSolicitacao(id);
  const atualizarStatus = useAtualizarStatusSolicitacao();
  const aprovar = useAprovarSolicitacao();
  const recusar = useRecusarSolicitacao();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const voltar =
    visao === 'admin' ? '/admin/imoveis/solicitacoes' : '/afiliado/solicitacoes';
  const rotuloVoltar = visao === 'admin' ? '← Solicitações' : '← Minhas solicitações';

  const pendente =
    atualizarStatus.isPending || aprovar.isPending || recusar.isPending;
  const erroAcao = aprovar.error ?? recusar.error ?? atualizarStatus.error;

  const onMudarStatus = (status: StatusSolicitacao) => {
    if (!solicitacao || status === solicitacao.status) return;

    const bloqueiaCalendario = status === 'APROVADA';
    const liberaCalendario =
      solicitacao.status === 'APROVADA' && status !== 'APROVADA';

    pedirConfirmacao({
      titulo: 'Alterar status?',
      descricao: [
        `A solicitação passará de “${rotuloStatusSolicitacao[solicitacao.status]}” para “${rotuloStatusSolicitacao[status]}”.`,
        bloqueiaCalendario
          ? 'O período desejado será reservado no calendário do apartamento.'
          : null,
        liberaCalendario
          ? 'O período reservado será liberado no calendário.'
          : null,
      ]
        .filter(Boolean)
        .join(' '),
      confirmarRotulo: 'Alterar',
      tom: status === 'FECHADA' || status === 'RECUSADA' ? 'perigo' : 'primario',
      onConfirmar: () => atualizarStatus.mutateAsync({ id, status }),
    });
  };

  const onAprovar = () => {
    if (!solicitacao) return;
    pedirConfirmacao({
      titulo: 'Aprovar reserva?',
      descricao: `O período ${formatarData(solicitacao.inicioDesejado)} — ${formatarData(solicitacao.fimDesejado)} será bloqueado no calendário de “${solicitacao.imovel.titulo}”.`,
      confirmarRotulo: 'Aprovar e bloquear',
      tom: 'primario',
      onConfirmar: () => aprovar.mutateAsync(id),
    });
  };

  const onRecusar = () => {
    if (!solicitacao) return;
    pedirConfirmacao({
      titulo: 'Recusar reserva?',
      descricao:
        solicitacao.status === 'APROVADA'
          ? 'A reserva será recusada e o período liberado no calendário.'
          : 'A solicitação será marcada como recusada. O período permanece disponível.',
      confirmarRotulo: 'Recusar',
      tom: 'perigo',
      onConfirmar: () => recusar.mutateAsync(id),
    });
  };

  if (isLoading) {
    return (
      <AreaLayout tipo={visao} titulo="Solicitação">
        <EstadoCarregando />
      </AreaLayout>
    );
  }

  if (isError || !solicitacao) {
    return (
      <AreaLayout tipo={visao} titulo="Solicitação não encontrada">
        <div className="estado-vazio">
          <p>Esta solicitação não existe ou você não tem acesso.</p>
          <Link to={voltar} className="botao-primario">
            Voltar
          </Link>
        </div>
      </AreaLayout>
    );
  }

  const pedidoExterno = solicitacao.afiliadoId == null;
  const podeDecidir =
    visao === 'admin' &&
    (solicitacao.status === 'ABERTA' || solicitacao.status === 'EM_ANDAMENTO');
  const encerrada =
    solicitacao.status === 'FECHADA' || solicitacao.status === 'RECUSADA';

  return (
    <AreaLayout
      tipo={visao}
      titulo={solicitacao.imovel.titulo}
      acoes={<Link to={voltar}>{rotuloVoltar}</Link>}
    >
      <header className="solicitacao-cabecalho">
        <div className="solicitacao-cabecalho-info">
          {visao === 'admin' && (
            <>
              <p className="solicitacao-afiliado-nome">{solicitacao.solicitanteExibicao}</p>
              <p className="solicitacao-perfil">
                {PERFIL_HOSPEDAGEM_PEDIDO_ROTULO[solicitacao.perfilHospedagem]}
                {pedidoExterno ? ' · pedido sem conta' : ''}
              </p>
            </>
          )}
          <p className="solicitacao-periodo">
            Período desejado: {formatarData(solicitacao.inicioDesejado)} —{' '}
            {formatarData(solicitacao.fimDesejado)}
          </p>
          <StatusSolicitacaoBadge status={solicitacao.status} />
          {solicitacao.status === 'APROVADA' && solicitacao.periodoId && (
            <p className="solicitacao-periodo-bloqueado">
              Período reservado no calendário do apartamento.
            </p>
          )}
        </div>

        {visao === 'admin' && (
          <div className="solicitacao-status-acoes">
            {podeDecidir && (
              <div className="solicitacao-decisao-botoes">
                <button
                  type="button"
                  className="botao-primario"
                  disabled={pendente}
                  onClick={onAprovar}
                >
                  Aprovar e bloquear calendário
                </button>
                <button
                  type="button"
                  className="botao-perigo"
                  disabled={pendente}
                  onClick={onRecusar}
                >
                  Recusar
                </button>
              </div>
            )}
            {solicitacao.status === 'APROVADA' && (
              <div className="solicitacao-decisao-botoes">
                <button
                  type="button"
                  className="botao-perigo"
                  disabled={pendente}
                  onClick={onRecusar}
                >
                  Cancelar aprovação
                </button>
              </div>
            )}
            <label htmlFor="status-solicitacao">Alterar status</label>
            <select
              id="status-solicitacao"
              value={solicitacao.status}
              disabled={pendente}
              onChange={(e) => onMudarStatus(e.target.value as StatusSolicitacao)}
            >
              {(Object.keys(rotuloStatusSolicitacao) as StatusSolicitacao[]).map((status) => (
                <option key={status} value={status}>
                  {rotuloStatusSolicitacao[status]}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {erroAcao && <p className="erro">{mensagemErro(erroAcao)}</p>}

      {visao === 'admin' && pedidoExterno && (
        <section className="solicitacao-dados-externos" aria-label="Dados do solicitante">
          <dl>
            {solicitacao.solicitanteCpf && (
              <div>
                <dt>CPF</dt>
                <dd>{solicitacao.solicitanteCpf}</dd>
              </div>
            )}
            {solicitacao.solicitanteEmail && (
              <div>
                <dt>E-mail</dt>
                <dd>
                  <a href={`mailto:${solicitacao.solicitanteEmail}`}>
                    {solicitacao.solicitanteEmail}
                  </a>
                </dd>
              </div>
            )}
            {solicitacao.solicitanteTelefone && (
              <div>
                <dt>Telefone</dt>
                <dd>{solicitacao.solicitanteTelefone}</dd>
              </div>
            )}
            {solicitacao.sindicatoOrigem && (
              <div>
                <dt>Sindicato de origem</dt>
                <dd>{solicitacao.sindicatoOrigem}</dd>
              </div>
            )}
            {solicitacao.acompanhantes && (
              <div>
                <dt>Acompanhantes</dt>
                <dd>{solicitacao.acompanhantes}</dd>
              </div>
            )}
            {solicitacao.observacoes && (
              <div>
                <dt>Observações</dt>
                <dd>{solicitacao.observacoes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {visao === 'admin' && !pedidoExterno && solicitacao.acompanhantes && (
        <p className="solicitacao-acompanhantes">
          <strong>Acompanhantes:</strong> {solicitacao.acompanhantes}
        </p>
      )}

      <ChatSolicitacao
        solicitacaoId={solicitacao.id}
        encerrada={encerrada}
        rotuloVazio={
          pedidoExterno
            ? 'Sem anotações ainda. Use o campo abaixo para registrar o contato com o solicitante.'
            : undefined
        }
      />
      {modalConfirmacao}
    </AreaLayout>
  );
}
