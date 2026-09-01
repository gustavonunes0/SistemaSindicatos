import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarMoeda } from '../../../lib/moeda';
import { urlDaApi } from '../../../lib/urls';
import { useImovel } from '../hooks';
import { CalendarioDisponibilidade } from './CalendarioDisponibilidade';
import { ReservaExterna } from './ReservaExterna';

export function ImovelDetalhePage() {
  const { id = '' } = useParams();
  const { data: imovel, isLoading, isError } = useImovel(id);
  const [fotoAtiva, setFotoAtiva] = useState(0);

  if (isLoading) {
    return (
      <AreaLayout tipo="afiliado" titulo="Apartamento">
        <EstadoCarregando mensagem="Carregando apartamento…" />
      </AreaLayout>
    );
  }

  if (isError || !imovel) {
    return (
      <AreaLayout tipo="afiliado" titulo="Apartamento não encontrado">
        <div className="estado-vazio">
          <p>Este apartamento não está mais disponível.</p>
          <Link to="/afiliado/imoveis" className="botao-primario">
            Voltar aos apartamentos
          </Link>
        </div>
      </AreaLayout>
    );
  }

  const fotos = imovel.fotos ?? [];
  const indiceCapa = Math.min(fotoAtiva, Math.max(fotos.length - 1, 0));
  const fotoPrincipal = fotos[indiceCapa];

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={imovel.titulo}
      descricao={imovel.endereco}
      acoes={
        <Link to="/afiliado/imoveis" className="botao-secundario">
          ← Apartamentos
        </Link>
      }
    >
      <article className="imovel-detalhe">
        <div className="imovel-detalhe-principal">
          {fotoPrincipal ? (
            <div className="imovel-galeria">
              <img
                className="imovel-galeria-principal"
                src={urlDaApi(fotoPrincipal.url)}
                alt={`Foto ${indiceCapa + 1} de ${fotos.length}`}
              />
              {fotos.length > 1 && (
                <div className="imovel-galeria-miniaturas">
                  {fotos.map((foto, indice) => (
                    <button
                      key={foto.id}
                      type="button"
                      className={indice === indiceCapa ? 'ativa' : undefined}
                      onClick={() => setFotoAtiva(indice)}
                      aria-label={`Ver foto ${indice + 1}`}
                      aria-current={indice === indiceCapa}
                    >
                      <img src={urlDaApi(foto.url)} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="imovel-sem-foto">Fotos em breve</div>
          )}

          <section className="imovel-bloco">
            <h2 className="imovel-secao-titulo">Sobre o apartamento</h2>
            <p className="imovel-detalhe-descricao">{imovel.descricao}</p>
          </section>

          {imovel.comodidades.length > 0 && (
            <section className="imovel-bloco">
              <h2 className="imovel-secao-titulo">Comodidades</h2>
              <ul className="imovel-comodidades">
                {imovel.comodidades.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <CalendarioDisponibilidade imovelId={imovel.id} />
        </div>

        <aside className="imovel-detalhe-lateral">
          <div className="imovel-resumo">
            <p className="imovel-detalhe-valor">
              {formatarMoeda(imovel.valor)}
              <span> por dia</span>
            </p>
            <p className="imovel-detalhe-endereco">{imovel.endereco}</p>
          </div>

          <ReservaExterna
            titulo="Reservar este apartamento"
            descricao="Confira as datas livres no calendário e conclua a reserva no sistema oficial do sindicato."
          />
        </aside>
      </article>
    </AreaLayout>
  );
}
