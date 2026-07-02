import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description?: string;
  image?: string;
}

function definirMeta(seletor: string, atributos: Record<string, string>, conteudo: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(seletor);
  if (!tag) {
    tag = document.createElement('meta');
    Object.entries(atributos).forEach(([chave, valor]) => tag!.setAttribute(chave, valor));
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', conteudo);
}

export function useSeo({ title, description, image }: SeoProps): void {
  useEffect(() => {
    document.title = title;
    definirMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    if (description) {
      definirMeta('meta[name="description"]', { name: 'description' }, description);
      definirMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    }
    if (image) {
      definirMeta('meta[property="og:image"]', { property: 'og:image' }, image);
    }
  }, [title, description, image]);
}

export function resumoDeHtml(html: string, limite = 160): string {
  const texto = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
}
