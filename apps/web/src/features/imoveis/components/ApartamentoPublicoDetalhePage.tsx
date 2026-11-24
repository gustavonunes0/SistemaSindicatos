import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMarca } from '../../../lib/marca';
import { useSeo } from '../../../lib/seo';
import { urlDaApi } from '../../../lib/urls';
import { SolicitarHospedagemPublicaForm } from '../../solicitacoes/components/SolicitarHospedagemPublicaForm';
import { useImovelPublico } from '../hooks';
import { mostrarVitrine, reservaPeloSistema } from '../modo';
import { CalendarioDisponibilidade } from './CalendarioDisponibilidade';
import { RegrasHospedagem } from './RegrasHospedagem';
import { ReservaExterna } from './ReservaExterna';

export function ApartamentoPublicoDetalhePage() {
  const marca = useMarca();
  const { id = '' } = useParams();
  const vitrineAtiva = mostrarVitrine(marca);
  const sistema = reservaPeloSistema(marca);
  const { data: imovel, isLoading, isError } = useImovelPublico(vitrineAtiva ? id : '');
  const [fotoAtiva, setFotoAtiva] = useState(0);

  useSeo({
    title: imovel ? `${imovel.titulo} — Apartamentos` : `Apartamento — ${marca.nome}`,
    description: imovel?.descricao?.slice(0, 160) ?? `Apartamentos de lazer do ${marca.nomeCompleto}.`,
  });

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
    return <Navigate to="/apartamentos" replace />;
  }

  if (isLoading) {
    return (
      <main className="apartamentos-public-page">
        <EstadoCarregando mensagem="Carregando apartamento…" />
      </main>
    );
  }

  if (isError || !imovel) {
    return (
      <main className="apartamentos-public-page">
        <div className="estado-vazio">
          <p className="eyebrow">Apartamentos</p>
          <h1>Imóvel indisponível</h1>
          <p>Este apartamento não está mais disponível para consulta.</p>
          <Link to="/apartamentos" className="botao-primario">
            Voltar aos apartamentos
          </Link>
        </div>
      </main>
    );
  }

  const indiceCapa = Math.min(fotoAtiva, Math.max(totalFotos - 1, 0));
  const fotoPrincipal = fotos[indiceCapa];

  return (
    <main className="apartamentos-public-page">
      <header className="apartamentos-public-cabecalho">
        <Link to="/apartamentos" className="botao-link">
          ← Apartamentos
        </Link>
        <h1>{imovel.titulo}</h1>
        <p>{imovel.endereco}</p>
      </header>

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

          <CalendarioDisponibilidade imovelId={imovel.id} publico />
        </div>

        <aside className="imovel-detalhe-lateral">
          <div className="imovel-resumo">
            <p className="eyebrow">Valores por perfil</p>
            <p className="imovel-detalhe-valor">
              Outros estados
              <span> a partir de R$ 50/dia</span>
            </p>
            <p className="imovel-detalhe-endereco">
              Não filiado: R$ 70/dia · máximo conforme regulamento
            </p>
          </div>

          {sistema ? (
            <SolicitarHospedagemPublicaForm imovelId={imovel.id} imovelTitulo={imovel.titulo} />
          ) : (
            <ReservaExterna
              compacta
              titulo="Concluir reserva"
              descricao="Confira as datas livres no calendário e finalize pelo canal oficial."
              ctaRotulo="Reservar agora"
            />
          )}

          <RegrasHospedagem compacta perfilDestaque="FILIADO_OUTRO" />
        </aside>
      </article>
    </main>
  );
}
