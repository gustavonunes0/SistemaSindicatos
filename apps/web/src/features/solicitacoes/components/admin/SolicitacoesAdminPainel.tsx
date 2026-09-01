import type { StatusSolicitacao } from '@sindprf/types';
import { Link } from 'react-router-dom';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useSolicitacoesAdmin } from '../../hooks';
import { rotuloStatusSolicitacao } from '../../status';
import { SolicitacaoResumoLinha } from '../SolicitacaoShared';

const PREFIXO = '/admin/imoveis/solicitacoes';

export function FiltroStatusSolicitacao({
  status,
  onChange,
}: {
  status: StatusSolicitacao | '';
  onChange: (valor: StatusSolicitacao | '') => void;
}) {
  return (
    <label className="filtro-inline">
      Status
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as StatusSolicitacao | '')}
      >
        <option value="">Todos</option>
        {(Object.keys(rotuloStatusSolicitacao) as StatusSolicitacao[]).map((valor) => (
          <option key={valor} value={valor}>
            {rotuloStatusSolicitacao[valor]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SolicitacoesAdminPainel({ status }: { status: StatusSolicitacao | '' }) {
  const filtro = status ? { status } : {};
  const { data: solicitacoes, isLoading, isError } = useSolicitacoesAdmin(filtro);

  return (
    <>
      {isLoading && <EstadoCarregando mensagem="Carregando solicitações…" />}
      {isError && (
        <p className="erro">Não foi possível carregar as solicitações. Tente novamente.</p>
      )}

      {solicitacoes && solicitacoes.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhuma solicitação encontrada.</p>
          <Link to="/admin/imoveis" className="botao-link">
            Ver cadastro de apartamentos
          </Link>
        </div>
      )}

      {solicitacoes && solicitacoes.length > 0 && (
        <div className="solicitacoes-lista">
          {solicitacoes.map((solicitacao) => (
            <SolicitacaoResumoLinha
              key={solicitacao.id}
              solicitacao={solicitacao}
              linkPrefix={PREFIXO}
              mostrarAfiliado
            />
          ))}
        </div>
      )}
    </>
  );
}
