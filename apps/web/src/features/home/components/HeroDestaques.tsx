import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { InstagramPost, NoticiaListagem } from '@sindprf/types';
import { useInstagramFeed } from '../../instagram/hooks';
import { useNoticiasDestaques } from '../../noticias/hooks';
import { urlDaApi } from '../../../lib/urls';

const LIMITE_TEXTO = 240;

type Slide =
  | { tipo: 'noticia'; id: string; titulo: string; imagem: string | null; href: string; data: Date }
  | { tipo: 'instagram'; id: string; titulo: string; imagem: string; href: string; data: Date };

function porDataDesc(a: Slide, b: Slide): number {
  return b.data.getTime() - a.data.getTime();
}

function slidesDeNoticias(noticias: NoticiaListagem[]): Slide[] {
  return noticias
    .map((n) => ({
      tipo: 'noticia' as const,
      id: `noticia-${n.id}`,
      titulo: n.titulo,
      imagem: n.capaUrl,
      href: `/noticias/${n.slug}`,
      data: n.publicadoEm ?? n.createdAt,
    }))
    .sort(porDataDesc);
}

function slidesDeInstagram(posts: InstagramPost[]): Slide[] {
  return posts
    .map((p) => ({
      tipo: 'instagram' as const,
      id: `ig-${p.id}`,
      titulo: p.caption?.trim() || 'Post no Instagram',
      imagem: p.mediaUrl,
      href: p.permalink,
      data: p.publicadoEm,
    }))
    .sort(porDataDesc);
}

function encurtar(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite - 1).trimEnd()}…`;
}

export function HeroDestaques() {
  const noticias = useNoticiasDestaques();
  const instagram = useInstagramFeed(true);

  const slides = useMemo(() => {
    // Sempre notícias primeiro; Instagram depois.
    return [
      ...slidesDeNoticias(noticias.data ?? []),
      ...slidesDeInstagram(instagram.data ?? []),
    ];
  }, [noticias.data, instagram.data]);

  const [indice, setIndice] = useState(0);

  // Mantém o hero preenchido até chegar o primeiro conteúdo.
  const carregando = slides.length === 0 && (noticias.isLoading || instagram.isLoading);

  useEffect(() => {
    setIndice(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndice((atual) => (atual + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [slides.length, indice]);

  if (carregando) {
    return (
      <div
        className="hero-destaques hero-destaques--carregando"
        aria-busy="true"
        aria-label="Carregando destaques"
      >
        <div className="hero-destaques-esqueleto" />
        <p className="hero-destaques-loading-texto">Carregando destaques…</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="hero-destaques hero-destaques--vazio" aria-label="Sem destaques">
        <div className="hero-destaques-placeholder" />
      </div>
    );
  }

  const slide = slides[Math.min(indice, slides.length - 1)]!;
  const tituloCurto = encurtar(slide.titulo, LIMITE_TEXTO);

  const media =
    slide.tipo === 'noticia' && slide.imagem ? (
      <img key={slide.id} src={urlDaApi(slide.imagem)} alt="" />
    ) : slide.tipo === 'instagram' ? (
      <img key={slide.id} src={slide.imagem} alt="" />
    ) : (
      <span key={slide.id} className="hero-destaques-placeholder" aria-hidden="true" />
    );

  const corpo = (
    <div className="hero-destaques-corpo">
      <span className="hero-destaques-tipo">
        {slide.tipo === 'noticia' ? 'Notícia' : 'Instagram'}
      </span>
      <p className="hero-destaques-titulo">{tituloCurto}</p>
      <span className="hero-destaques-acao">
        {slide.tipo === 'noticia' ? 'Ler notícia' : 'Ver no Instagram'}{' '}
        <span aria-hidden="true">→</span>
      </span>
    </div>
  );

  return (
    <div className="hero-destaques" aria-roledescription="carrossel" aria-label="Destaques">
      {slide.tipo === 'noticia' ? (
        <Link to={slide.href} className="hero-destaques-link">
          <div className="hero-destaques-media">{media}</div>
          {corpo}
        </Link>
      ) : (
        <a href={slide.href} className="hero-destaques-link" target="_blank" rel="noreferrer">
          <div className="hero-destaques-media">{media}</div>
          {corpo}
        </a>
      )}

      {slides.length > 1 && (
        <div className="hero-destaques-controles">
          <button
            type="button"
            className="hero-destaques-nav"
            aria-label="Anterior"
            onClick={() =>
              setIndice((atual) => (atual - 1 + slides.length) % slides.length)
            }
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className="hero-destaques-dots" role="tablist" aria-label="Slides">
            {slides.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === indice}
                aria-label={`Slide ${i + 1}`}
                className={
                  i === indice
                    ? 'hero-destaques-dot hero-destaques-dot--ativo'
                    : 'hero-destaques-dot'
                }
                onClick={() => setIndice(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="hero-destaques-nav"
            aria-label="Próximo"
            onClick={() => setIndice((atual) => (atual + 1) % slides.length)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      )}
    </div>
  );
}
