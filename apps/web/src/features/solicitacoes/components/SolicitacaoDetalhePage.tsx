import type { StatusSolicitacao } from '@sindprf/types';
import { Link, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { formatarData } from '../../../lib/datas';
import { useAtualizarStatusSolicitacao, useSolicitacao } from '../hooks';
import { rotuloStatusSolicitacao } from '../status';
import { ChatSolicitacao } from './ChatSolicitacao';
import { StatusSolicitacaoBadge } from './SolicitacaoShared';

type SolicitacaoDetalhePageProps = {
  visao: 'admin' | 'afiliado';
};

export function SolicitacaoDetalhePage({ visao }: SolicitacaoDetalhePageProps) {
  const { id = '' } = useParams();
  const { data: solicitacao, isLoading, isError } = useSolicitacao(id);
  const atualizarStatus = useAtualizarStatusSolicitacao();

  const voltar =
    visao === 'admin' ? '/admin/solicitacoes' : '/afiliado/solicitacoes';
  const rotuloVoltar = visao === 'admin' ? '← Solicitações' : '← Minhas solicitações';

  const onMudarStatus = (status: StatusSolicitacao) => {
    atualizarStatus.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <AreaLayout tipo={visao} titulo="Solicitação">
        <p className="estado-carregando">Carregando…</p>
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

  return (
    <AreaLayout
      tipo={visao}
      titulo={solicitacao.imovel.titulo}
      acoes={<Link to={voltar}>{rotuloVoltar}</Link>}
    >
      <header className="solicitacao-cabecalho">
        <div className="solicitacao-cabecalho-info">
          {visao === 'admin' && (
            <p className="solicitacao-afiliado-nome">{solicitacao.afiliado.nome}</p>
          )}
          <p className="solicitacao-periodo">
            Período desejado: {formatarData(solicitacao.inicioDesejado)} —{' '}
            {formatarData(solicitacao.fimDesejado)}
          </p>
          <StatusSolicitacaoBadge status={solicitacao.status} />
        </div>

        {visao === 'admin' && (
          <div className="solicitacao-status-acoes">
            <label htmlFor="status-solicitacao">Alterar status</label>
            <select
              id="status-solicitacao"
              value={solicitacao.status}
              disabled={atualizarStatus.isPending}
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

      <ChatSolicitacao
        solicitacaoId={solicitacao.id}
        encerrada={solicitacao.status === 'FECHADA'}
      />
    </AreaLayout>
  );
}
