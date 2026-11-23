import { useCallback, useEffect, useState } from 'react';
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
  const [erroDownload, setErroDownload] = useState<string>();

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

  async function baixarAtual() {
    if (!fotoPrincipal) return;
    setErroDownload(undefined);
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
        const nome = foto.nomeOriginal ?? `evento-${slugTitulo}-${i + 1}.jpg`;
        await baixarImagem(foto.url, nome);
      }
    } catch {
      setErroDownload('Não foi possível baixar todas as imagens. Tente novamente.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <AreaLayout
      tipo="afiliado"
      titulo={evento.titulo}
      descricao={[
        evento.dataEvento ? formatarDataEvento(evento.dataEvento) : null,
        evento.local,
      ]
        .filter(Boolean)
        .join(' · ')}
      acoes={
        <Link to="/afiliado/eventos" className="botao-secundario">
          ← Eventos
        </Link>
      }
    >
      <article className="evento-detalhe">
        {evento.descricao && <p className="evento-detalhe-descricao">{evento.descricao}</p>}

        {fotoPrincipal ? (
          <div className="evento-galeria">
            <div className="evento-galeria-palco">
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
                  <span className="evento-galeria-indice">
                    {indice + 1} / {totalFotos}
                  </span>
                </>
              )}
            </div>

            {totalFotos > 1 && (
              <ul className="evento-galeria-miniaturas">
                {fotos.map((foto, i) => (
                  <li key={foto.id}>
                    <button
                      type="button"
                      className={i === indice ? 'evento-miniatura evento-miniatura--ativa' : 'evento-miniatura'}
                      onClick={() => setFotoAtiva(i)}
                      aria-label={`Ver foto ${i + 1}`}
                      aria-current={i === indice}
                    >
                      <img src={urlDaApi(foto.url)} alt="" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="evento-galeria-acoes">
              <button
                type="button"
                className="botao-primario"
                disabled={baixando}
                onClick={() => void baixarAtual()}
              >
                {baixando ? 'Baixando…' : 'Baixar esta foto'}
              </button>
              {totalFotos > 1 && (
                <button
                  type="button"
                  className="botao-secundario"
                  disabled={baixando}
                  onClick={() => void baixarTodas()}
                >
                  Baixar todas
                </button>
              )}
            </div>
            {erroDownload && <p className="erro">{erroDownload}</p>}
          </div>
        ) : (
          <div className="estado-vazio">
            <p>Este evento ainda não tem fotos na galeria.</p>
          </div>
        )}
      </article>
    </AreaLayout>
  );
}
