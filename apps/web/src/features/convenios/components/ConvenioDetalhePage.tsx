import { Link, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../lib/datas';
import { urlDaApi } from '../../../lib/urls';
import { useConvenio } from '../hooks';

export function ConvenioDetalhePage() {
  const { id = '' } = useParams();
  const { data: convenio, isLoading, isError } = useConvenio(id);

  if (isLoading) {
    return (
      <AreaLayout tipo="afiliado" titulo="Convênio">
        <EstadoCarregando mensagem="Carregando convênio…" />
      </AreaLayout>
    );
  }

  if (isError || !convenio) {
    return (
      <AreaLayout tipo="afiliado" titulo="Convênio não encontrado">
        <div className="estado-vazio">
          <p>Este convênio não está mais disponível.</p>
          <Link to="/afiliado/convenios" className="botao-primario">
            Voltar aos convênios
          </Link>
        </div>
      </AreaLayout>
    );
  }

  const vigencia = convenio.vigenciaFim
    ? `Válido até ${formatarData(convenio.vigenciaFim)}`
    : null;

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={convenio.nome}
      acoes={<Link to="/afiliado/convenios">← Convênios</Link>}
    >
      <article className="convenio-detalhe">
        <div className="convenio-detalhe-topo">
          <div className="convenio-detalhe-logo" aria-hidden={!convenio.logoUrl}>
            {convenio.logoUrl ? (
              <img src={urlDaApi(convenio.logoUrl)} alt="" />
            ) : (
              <span>{convenio.nome.charAt(0)}</span>
            )}
          </div>
          <div>
            <span className="convenio-categoria">{convenio.categoria}</span>
            {vigencia && <p className="convenio-vigencia">{vigencia}</p>}
          </div>
        </div>

        <p className="convenio-descricao">{convenio.descricao}</p>

        <dl className="convenio-dados">
          {convenio.contato && (
            <div>
              <dt>Contato</dt>
              <dd>{convenio.contato}</dd>
            </div>
          )}
        </dl>

        {convenio.link && (
          <a className="botao-primario" href={convenio.link} target="_blank" rel="noreferrer">
            Acessar o parceiro
          </a>
        )}
      </article>
    </AreaLayout>
  );
}
