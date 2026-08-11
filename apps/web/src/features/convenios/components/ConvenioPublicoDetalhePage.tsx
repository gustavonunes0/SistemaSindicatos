import { Link, useParams } from 'react-router-dom';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../lib/datas';
import { useMarca } from '../../../lib/marca';
import { useSeo } from '../../../lib/seo';
import { urlDaApi } from '../../../lib/urls';
import { normalizarCategoriaConvenio } from '../categorias';
import { useConvenio } from '../hooks';

export function ConvenioPublicoDetalhePage() {
  const { id = '' } = useParams();
  const marca = useMarca();
  const { data: convenio, isLoading, isError } = useConvenio(id);

  useSeo({
    title: convenio
      ? `${convenio.nome} — Convênios — ${marca.nome}`
      : `Convênio — ${marca.nome}`,
    description: convenio?.descricao?.slice(0, 160) ?? `Detalhes do convênio no ${marca.nomeCompleto}.`,
  });

  if (isLoading && !convenio) {
    return (
      <main className="convenio-publico-page">
        <div className="convenio-publico-corpo secao-inner">
          <EstadoCarregando mensagem="Carregando convênio…" />
        </div>
      </main>
    );
  }

  if (isError || !convenio) {
    return (
      <main className="convenio-publico-page">
        <div className="convenio-publico-corpo secao-inner">
          <div className="estado-vazio">
            <p>Este convênio não está disponível ou foi removido.</p>
            <Link to="/convenios" className="botao-primario">
              Voltar aos convênios
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const categoria = normalizarCategoriaConvenio(convenio.categoria);
  const vigencia = convenio.vigenciaFim
    ? `Válido até ${formatarData(convenio.vigenciaFim)}`
    : convenio.vigenciaInicio
      ? `Desde ${formatarData(convenio.vigenciaInicio)}`
      : null;

  return (
    <main className="convenio-publico-page">
      <section className="convenio-publico-hero" aria-labelledby="convenio-detalhe-titulo">
        <div className="convenio-publico-hero-inner">
          <Link to="/convenios" className="convenio-publico-voltar">
            ← Convênios
          </Link>
          <p className="eyebrow convenio-publico-eyebrow">{categoria}</p>
          <div className="convenio-publico-hero-topo">
            <div className="convenio-publico-logo" aria-hidden={!convenio.logoUrl}>
              {convenio.logoUrl ? (
                <img src={urlDaApi(convenio.logoUrl)} alt="" />
              ) : (
                <span>{convenio.nome.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 id="convenio-detalhe-titulo">{convenio.nome}</h1>
              {vigencia ? <p className="convenio-publico-vigencia">{vigencia}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="convenio-publico-corpo secao-inner">
        <article className="convenio-publico-artigo">
          <h2>Sobre o benefício</h2>
          <p className="convenio-publico-descricao">{convenio.descricao}</p>

          {(convenio.contato || convenio.link) && (
            <dl className="convenio-publico-dados">
              {convenio.contato ? (
                <div>
                  <dt>Contato</dt>
                  <dd>{convenio.contato}</dd>
                </div>
              ) : null}
              {convenio.link ? (
                <div>
                  <dt>Site</dt>
                  <dd>
                    <a href={convenio.link} target="_blank" rel="noreferrer">
                      {convenio.link.replace(/^https?:\/\//, '')}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          )}

          <div className="convenio-publico-acoes">
            {convenio.link ? (
              <a
                className="botao-primario"
                href={convenio.link}
                target="_blank"
                rel="noreferrer"
              >
                Acessar o parceiro
              </a>
            ) : null}
            {convenio.emiteDeclaracao ? (
              <Link to="/login" className="botao-secundario">
                Entrar para emitir declaração
              </Link>
            ) : (
              <Link to="/convenios" className="botao-secundario">
                Ver outros convênios
              </Link>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
