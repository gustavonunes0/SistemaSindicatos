import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { urlDaApi } from '../../../lib/urls';
import { baixarImagem } from '../baixarImagem';
import { formatarDataEvento } from '../formatarDataEvento';
import { useEvento } from '../hooks';

export function EventoDetalhePage() {
  const { id = '' } = useParams();
  const { data: evento, isLoading, isError } = useEvento(id);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [baixando, setBaixando] = useState(false);
  const [progressoDownload, setProgressoDownload] = useState<string>();
  const [erroDownload, setErroDownload] = useState<string>();
  const palcoRef = useRef<HTMLDivElement | null>(null);

  const fotos = evento?.fotos ?? [];
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
    setErroDownload(undefined);
    setProgressoDownload(undefined);
  }, [evento?.id]);

  useEffect(() => {
    if (totalFotos <= 1) return;
    const onTecla = (eventoTecla: KeyboardEvent) => {
      if (eventoTecla.key === 'ArrowLeft') irPara(fotoAtiva - 1);
      if (eventoTecla.key === 'ArrowRight') irPara(fotoAtiva + 1);
    };
    window.addEventListener('keydown', onTecla);
    return () => window.removeEventListener('keydown', onTecla);
  }, [fotoAtiva, irPara, totalFotos]);

  if (isLoading) {
    return (
      <AreaLayout tipo="afiliado" titulo="Evento">
        <EstadoCarregando mensagem="Carregando evento…" />
      </AreaLayout>
    );
  }

  if (isError || !evento) {
    return (
      <AreaLayout tipo="afiliado" titulo="Evento não encontrado">
        <div className="estado-vazio">
          <p className="eyebrow">Eventos</p>
          <h2>Evento indisponível</h2>
          <p>Este evento não está mais disponível para consulta.</p>
          <Link to="/afiliado/eventos" className="botao-primario">
            Voltar aos eventos
          </Link>
        </div>
      </AreaLayout>
    );
  }

  const indice = Math.min(fotoAtiva, Math.max(totalFotos - 1, 0));
  const fotoPrincipal = fotos[indice];
  const slugTitulo = evento.titulo.replace(/\s+/g, '-').toLowerCase();
  const dataFormatada = evento.dataEvento ? formatarDataEvento(evento.dataEvento) : null;

  async function baixarAtual() {
    if (!fotoPrincipal) return;
    setErroDownload(undefined);
    setProgressoDownload(undefined);
    setBaixando(true);
    try {
      const nome =
        fotoPrincipal.nomeOriginal ?? `evento-${slugTitulo}-${indice + 1}.jpg`;
      await baixarImagem(fotoPrincipal.url, nome);
    } catch {
      setErroDownload('Não foi possível baixar a imagem. Tente novamente.');
    } finally {
      setBaixando(false);
    }
  }

  async function baixarTodas() {
    if (fotos.length === 0) return;
    setErroDownload(undefined);
    setBaixando(true);
    try {
      for (let i = 0; i < fotos.length; i += 1) {
        const foto = fotos[i]!;
        setProgressoDownload(`Baixando ${i + 1} de ${fotos.length}…`);
        const nome = foto.nomeOriginal ?? `evento-${slugTitulo}-${i + 1}.jpg`;
        await baixarImagem(foto.url, nome);
      }
      setProgressoDownload(undefined);
    } catch {
      setErroDownload('Não foi possível baixar todas as imagens. Tente novamente.');
    } finally {
      setBaixando(false);
    }
  }

  function selecionarFoto(indiceNovo: number) {
    setFotoAtiva(indiceNovo);
    palcoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={evento.titulo}
      descricao="Informações e galeria do evento"
      acoes={
        <Link to="/afiliado/eventos" className="botao-secundario">
          ← Eventos
        </Link>
      }
    >
      <article className="evento-detalhe">
        <header className="evento-detalhe-meta">
          {dataFormatada && (
            <div className="evento-detalhe-dado">
              <span className="evento-detalhe-dado-rotulo">Data</span>
              <strong>{dataFormatada}</strong>
            </div>
          )}
          {evento.local && (
            <div className="evento-detalhe-dado">
              <span className="evento-detalhe-dado-rotulo">Local</span>
              <strong>{evento.local}</strong>
            </div>
          )}
          <div className="evento-detalhe-dado">
            <span className="evento-detalhe-dado-rotulo">Galeria</span>
            <strong>
              {totalFotos === 0
                ? 'Sem fotos'
                : `${totalFotos} ${totalFotos === 1 ? 'foto' : 'fotos'}`}
            </strong>
          </div>
        </header>

        {evento.descricao && (
          <div className="evento-detalhe-texto">
            <p className="eyebrow">Sobre o evento</p>
            <p className="evento-detalhe-descricao">{evento.descricao}</p>
          </div>
        )}

        {fotoPrincipal ? (
          <section className="evento-galeria" aria-label="Galeria de fotos">
            <div ref={palcoRef} className="evento-galeria-palco">
              <img
                className="evento-galeria-principal"
                src={urlDaApi(fotoPrincipal.url)}
                alt={`Foto ${indice + 1} de ${totalFotos}`}
              />
              {totalFotos > 1 && (
                <>
                  <button
                    type="button"
                    className="evento-galeria-nav evento-galeria-nav--ant"
                    aria-label="Foto anterior"
                    onClick={() => irPara(indice - 1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="evento-galeria-nav evento-galeria-nav--prox"
                    aria-label="Próxima foto"
                    onClick={() => irPara(indice + 1)}
                  >
                    →
                  </button>
                </>
              )}
              <div className="evento-galeria-palco-rodape">
                <span className="evento-galeria-indice">
                  {indice + 1} / {totalFotos}
                </span>
                {fotoPrincipal.nomeOriginal && (
                  <span className="evento-galeria-nome" title={fotoPrincipal.nomeOriginal}>
                    {fotoPrincipal.nomeOriginal}
                  </span>
                )}
              </div>
            </div>

            <div className="evento-galeria-acoes">
              <button
                type="button"
                className="botao-primario"
                disabled={baixando}
                onClick={() => void baixarAtual()}
              >
                {baixando && !progressoDownload ? 'Baixando…' : 'Baixar esta foto'}
              </button>
              {totalFotos > 1 && (
                <button
                  type="button"
                  className="botao-secundario"
                  disabled={baixando}
                  onClick={() => void baixarTodas()}
                >
                  {progressoDownload ?? 'Baixar todas'}
                </button>
              )}
              {totalFotos > 1 && (
                <p className="evento-galeria-dica texto-secundario">
                  Use as setas do teclado para navegar.
                </p>
              )}
            </div>
            {erroDownload && <p className="erro">{erroDownload}</p>}

            {totalFotos > 1 && (
              <div className="evento-galeria-todas">
                <div className="evento-galeria-todas-topo">
                  <h2>Todas as fotos</h2>
                  <p className="texto-secundario">
                    Clique em qualquer imagem para ampliá-la acima.
                  </p>
                </div>
                <ul className="evento-galeria-grade">
                  {fotos.map((foto, i) => {
                    const ativa = i === indice;
                    return (
                      <li key={foto.id}>
                        <button
                          type="button"
                          className={
                            ativa
                              ? 'evento-galeria-thumb evento-galeria-thumb--ativa'
                              : 'evento-galeria-thumb'
                          }
                          onClick={() => selecionarFoto(i)}
                          aria-label={`Ver foto ${i + 1}`}
                          aria-current={ativa}
                        >
                          <img
                            src={urlDaApi(foto.url)}
                            alt=""
                            loading="lazy"
                          />
                          <span className="evento-galeria-thumb-num" aria-hidden="true">
                            {i + 1}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        ) : (
          <div className="estado-vazio">
            <p>Este evento ainda não tem fotos na galeria.</p>
          </div>
        )}
      </article>
    </AreaLayout>
  );
}
