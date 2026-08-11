import type { NoticiasPaginadas } from '@sindprf/types';
import { noticiasPaginadasSchema } from '@sindprf/types';

function chave(page: number, limit: number): string {
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : 'local';
  return `sindprf:noticias:${host}:${page}:${limit}`;
}

/** Lê listagem cacheada no sessionStorage (pinta a UI sem esperar a rede). */
export function lerCacheNoticias(page: number, limit: number): NoticiasPaginadas | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const bruto = sessionStorage.getItem(chave(page, limit));
    if (!bruto) return undefined;
    const parsed: unknown = JSON.parse(bruto);
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed) || !('at' in parsed)) {
      return undefined;
    }
    const { data, at } = parsed as { data: unknown; at: number };
    // Descarta cache com mais de 30 min.
    if (Date.now() - at > 30 * 60 * 1000) return undefined;
    return noticiasPaginadasSchema.parse(data);
  } catch {
    return undefined;
  }
}

export function gravarCacheNoticias(page: number, limit: number, data: NoticiasPaginadas): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(chave(page, limit), JSON.stringify({ at: Date.now(), data }));
  } catch {
    // quota / modo privado
  }
}

export function limparCacheNoticias(): void {
  if (typeof window === 'undefined') return;
  try {
    const prefixo = `sindprf:noticias:${window.location.hostname.toLowerCase()}:`;
    const remover: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(prefixo)) remover.push(k);
    }
    for (const k of remover) sessionStorage.removeItem(k);
  } catch {
    // ignora
  }
}
