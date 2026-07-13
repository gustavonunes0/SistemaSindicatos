import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMinhasSolicitacoes } from '../hooks';
import { SolicitacaoResumoLinha } from './SolicitacaoShared';

export function MinhasSolicitacoesPage() {
  const { data: solicitacoes, isLoading, isError } = useMinhasSolicitacoes();

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Minhas solicitações"
      acoes={<Link to="/afiliado/imoveis">← Apartamentos</Link>}
    >
      {isLoading && <EstadoCarregando mensagem="Carregando solicitações…" />}
      {isError && (
        <p className="erro">Não foi possível carregar suas solicitações. Tente novamente.</p>
      )}

      {solicitacoes && solicitacoes.length === 0 && (
        <div className="estado-vazio">
          <p>Você ainda não abriu nenhuma solicitação de locação.</p>
          <Link to="/afiliado/imoveis" className="botao-primario">
            Ver apartamentos
          </Link>
        </div>
      )}

      {solicitacoes && solicitacoes.length > 0 && (
        <div className="solicitacoes-lista">
          {solicitacoes.map((solicitacao) => (
            <SolicitacaoResumoLinha
              key={solicitacao.id}
              solicitacao={solicitacao}
              linkPrefix="/afiliado/solicitacoes"
            />
          ))}
        </div>
      )}
    </AreaLayout>
  );
}
