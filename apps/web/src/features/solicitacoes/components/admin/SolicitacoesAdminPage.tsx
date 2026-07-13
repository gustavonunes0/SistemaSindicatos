import type { StatusSolicitacao } from '@sindprf/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useSolicitacoesAdmin } from '../../hooks';
import { rotuloStatusSolicitacao } from '../../status';
import { SolicitacaoResumoLinha } from '../SolicitacaoShared';

export function SolicitacoesAdminPage() {
  const [status, setStatus] = useState<StatusSolicitacao | ''>('');
  const filtro = status ? { status } : {};
  const { data: solicitacoes, isLoading, isError } = useSolicitacoesAdmin(filtro);

  return (
    <AreaLayout
      tipo="admin"
      titulo="Solicitações de locação"
      acoes={
        <label className="filtro-inline">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusSolicitacao | '')}
          >
            <option value="">Todos</option>
            {(Object.keys(rotuloStatusSolicitacao) as StatusSolicitacao[]).map((valor) => (
              <option key={valor} value={valor}>
                {rotuloStatusSolicitacao[valor]}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {isLoading && <EstadoCarregando mensagem="Carregando solicitações…" />}
      {isError && (
        <p className="erro">Não foi possível carregar as solicitações. Tente novamente.</p>
      )}

      {solicitacoes && solicitacoes.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhuma solicitação encontrada.</p>
          <Link to="/admin/imoveis" className="botao-link">
            Gerenciar apartamentos
          </Link>
        </div>
      )}

      {solicitacoes && solicitacoes.length > 0 && (
        <div className="solicitacoes-lista">
          {solicitacoes.map((solicitacao) => (
            <SolicitacaoResumoLinha
              key={solicitacao.id}
              solicitacao={solicitacao}
              linkPrefix="/admin/solicitacoes"
              mostrarAfiliado
            />
          ))}
        </div>
      )}
    </AreaLayout>
  );
}
