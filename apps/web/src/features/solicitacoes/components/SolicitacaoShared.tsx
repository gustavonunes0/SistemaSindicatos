import { Link } from 'react-router-dom';
import { formatarData } from '../../../lib/datas';
import type { SolicitacaoResumo, StatusSolicitacao } from '@sindprf/types';
import { PERFIL_HOSPEDAGEM_PEDIDO_ROTULO } from '@sindprf/types';
import { classeStatusSolicitacao, rotuloStatusSolicitacao } from '../status';

export function StatusSolicitacaoBadge({ status }: { status: StatusSolicitacao }) {
  return (
    <span className={`badge ${classeStatusSolicitacao[status]}`}>
      {rotuloStatusSolicitacao[status]}
    </span>
  );
}

export function SolicitacaoResumoLinha({
  solicitacao,
  linkPrefix,
  mostrarAfiliado = false,
}: {
  solicitacao: SolicitacaoResumo;
  linkPrefix: '/afiliado/solicitacoes' | '/admin/solicitacoes' | '/admin/imoveis/solicitacoes';
  mostrarAfiliado?: boolean;
}) {
  return (
    <Link to={`${linkPrefix}/${solicitacao.id}`} className="solicitacao-linha">
      <div className="solicitacao-linha-principal">
        <strong>{solicitacao.imovel.titulo}</strong>
        {mostrarAfiliado && (
          <span className="solicitacao-linha-afiliado">
            {solicitacao.solicitanteExibicao}
            {solicitacao.afiliadoId == null && (
              <span className="solicitacao-linha-perfil">
                {' '}
                · {PERFIL_HOSPEDAGEM_PEDIDO_ROTULO[solicitacao.perfilHospedagem]}
              </span>
            )}
          </span>
        )}
        <span className="solicitacao-linha-datas">
          {formatarData(solicitacao.inicioDesejado)} — {formatarData(solicitacao.fimDesejado)}
        </span>
      </div>
      <div className="solicitacao-linha-meta">
        <StatusSolicitacaoBadge status={solicitacao.status} />
        <span className="solicitacao-linha-msg">
          {solicitacao.totalMensagens} msg{solicitacao.totalMensagens === 1 ? '' : 's'}
        </span>
      </div>
    </Link>
  );
}
