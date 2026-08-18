import { MODELO_DECLARACAO_ROTULO, STATUS_DECLARACAO_ROTULO } from '@sindprf/types';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../lib/datas';
import { useBaixarDeclaracao, useMinhasDeclaracoes } from '../hooks';

export function MinhasDeclaracoesPage() {
  const { data: declaracoes, isLoading, isError } = useMinhasDeclaracoes();
  const baixar = useBaixarDeclaracao();

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Minhas declarações"
      descricao="Acompanhe as declarações emitidas e baixe a versão assinada quando ficar pronta."
    >
      {isLoading && !declaracoes && <EstadoCarregando />}
      {isError && !declaracoes && <p className="erro">Erro ao carregar suas declarações.</p>}

      {declaracoes && declaracoes.length === 0 && (
        <div className="estado-vazio">
          <p>Você ainda não emitiu nenhuma declaração.</p>
          <Link to="/afiliado/convenios" className="botao-primario">
            Ver convênios
          </Link>
        </div>
      )}

      {declaracoes && declaracoes.length > 0 && (
        <ul className="lista-declaracoes">
          {declaracoes.map((declaracao) => (
            <li key={declaracao.id} className="card-declaracao">
              <div>
                <h2>{declaracao.convenioNome}</h2>
                <p className="texto-secundario">
                  {MODELO_DECLARACAO_ROTULO[declaracao.modelo]} · emitida em{' '}
                  {formatarData(declaracao.emitidaEm)} · código {declaracao.codigo}
                </p>
                {declaracao.dependenteNome && (
                  <p className="texto-secundario">Dependente: {declaracao.dependenteNome}</p>
                )}
                <span className={`badge badge-declaracao-${declaracao.status.toLowerCase()}`}>
                  {STATUS_DECLARACAO_ROTULO[declaracao.status]}
                </span>
              </div>

              <div className="card-declaracao-acoes">
                {declaracao.temArquivoAssinado ? (
                  <button
                    type="button"
                    className="botao-primario"
                    disabled={baixar.isPending}
                    onClick={() => baixar.mutate({ id: declaracao.id, versao: 'assinada' })}
                  >
                    Baixar assinada
                  </button>
                ) : (
                  <span className="texto-secundario">
                    A versão assinada aparece aqui assim que o sindicato devolver.
                  </span>
                )}

                {declaracao.temArquivoOriginal && (
                  <button
                    type="button"
                    className="botao-secundario"
                    disabled={baixar.isPending}
                    onClick={() => baixar.mutate({ id: declaracao.id, versao: 'original' })}
                  >
                    Baixar original
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AreaLayout>
  );
}
