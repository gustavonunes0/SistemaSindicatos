import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { formatarMoeda } from '../../../lib/moeda';
import { useMarca } from '../../../lib/marca';
import { urlDaApi } from '../../../lib/urls';
import { useImovel } from '../hooks';
import { modoImoveis } from '../modo';
import { CalendarioDisponibilidade } from './CalendarioDisponibilidade';
import { ReservaExterna } from './ReservaExterna';

export function ImovelDetalhePage() {
  const marca = useMarca();
  const { id = '' } = useParams();
  const vitrineAtiva = modoImoveis(marca) === 'VITRINE';
  const { data: imovel, isLoading, isError } = useImovel(vitrineAtiva ? id : '');
  const [fotoAtiva, setFotoAtiva] = useState(0);

  const fotos = imovel?.fotos ?? [];
  const totalFotos = fotos.length;

  const irPara = useCallback(
    (indice: number) => {
      if (totalFotos === 0) return;
      setFotoAtiva(((indice % totalFotos) + totalFotos) % totalFotos);
    },
    [totalFotos],
  );

  useEffect(() => {
    setFotoAtiva(0);
  }, [imovel?.id]);

  useEffect(() => {
    if (totalFotos <= 1) return;
    const onTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'ArrowLeft') irPara(fotoAtiva - 1);
      if (evento.key === 'ArrowRight') irPara(fotoAtiva + 1);
    };
    window.addEventListener('keydown', onTecla);
    return () => window.removeEventListener('keydown', onTecla);
  }, [fotoAtiva, irPara, totalFotos]);

  if (!vitrineAtiva) {
    return <Navigate to="/afiliado/imoveis" replace />;
  }

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
          <p className="eyebrow">Apartamentos</p>
          <h2>Imóvel indisponível</h2>
          <p>Este apartamento não está mais disponível para consulta.</p>
          <Link to="/afiliado/imoveis" className="botao-primario">
            Voltar aos apartamentos
          </Link>
        </div>
      </AreaLayout>
    );
  }

  const indiceCapa = Math.min(fotoAtiva, Math.max(totalFotos - 1, 0));
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
              <div className="imovel-galeria-palco">
                <img
                  className="imovel-galeria-principal"
                  src={urlDaApi(fotoPrincipal.url)}
                  alt={`Foto ${indiceCapa + 1} de ${totalFotos}`}
                />
                {totalFotos > 1 && (
                  <>
                    <button
                      type="button"
                      className="imovel-galeria-nav imovel-galeria-nav--ant"
                      aria-label="Foto anterior"
                      onClick={() => irPara(indiceCapa - 1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="imovel-galeria-nav imovel-galeria-nav--prox"
                      aria-label="Próxima foto"
                      onClick={() => irPara(indiceCapa + 1)}
                    >
                      →
                    </button>
                    <span className="imovel-galeria-indice">
                      {indiceCapa + 1} / {totalFotos}
                    </span>
                  </>
                )}
              </div>
              {totalFotos > 1 && (
                <div className="imovel-galeria-miniaturas" role="tablist" aria-label="Fotos">
                  {fotos.map((foto, indice) => (
                    <button
                      key={foto.id}
                      type="button"
                      role="tab"
                      className={indice === indiceCapa ? 'ativa' : undefined}
                      onClick={() => setFotoAtiva(indice)}
                      aria-label={`Ver foto ${indice + 1}`}
                      aria-selected={indice === indiceCapa}
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
            <p className="eyebrow">Diária</p>
            <p className="imovel-detalhe-valor">
              {formatarMoeda(imovel.valor)}
              <span> por dia</span>
            </p>
            <p className="imovel-detalhe-endereco">{imovel.endereco}</p>
            {imovel.comodidades.length > 0 && (
              <p className="imovel-resumo-meta">
                {imovel.comodidades.length}{' '}
                {imovel.comodidades.length === 1 ? 'comodidade' : 'comodidades'}
              </p>
            )}
          </div>

          <ReservaExterna
            compacta
            titulo="Concluir reserva"
            descricao="Confira as datas livres no calendário e finalize pelo sistema oficial."
            ctaRotulo="Reservar agora"
          />
        </aside>
      </article>
    </AreaLayout>
  );
}
