import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { AguardandoAprovacao } from '../../afiliado/components/AguardandoAprovacao';
import { useMe } from '../../auth/hooks';
import { useMinhasSolicitacoes } from '../hooks';
import { SolicitacaoResumoLinha } from './SolicitacaoShared';

export function MinhasSolicitacoesPage() {
  const { data: me, isLoading: carregandoMe } = useMe();
  const aprovado = me?.afiliado?.status === 'APROVADO';
  const { data: solicitacoes, isLoading, isError } = useMinhasSolicitacoes(aprovado);

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Minhas solicitações"
      acoes={aprovado ? <Link to="/afiliado/imoveis">← Apartamentos</Link> : undefined}
    >
      {carregandoMe && <EstadoCarregando mensagem="Carregando…" />}

      {!carregandoMe && !aprovado && <AguardandoAprovacao recurso="As solicitações" />}

      {!carregandoMe && aprovado && (
        <>
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
        </>
      )}
    </AreaLayout>
  );
}
