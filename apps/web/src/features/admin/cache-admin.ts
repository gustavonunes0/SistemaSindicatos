import type { ConvenioListagem, NoticiaListagem } from '@sindprf/types';
import { convenioListagemSchema, noticiaListagemSchema } from '@sindprf/types';
import { z } from 'zod';
import type { AfiliadosAdminPaginados } from '../afiliado/api';
import { afiliadosAdminPaginadosSchema } from '../afiliado/api';

function hostAtual(): string {
  return typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : 'local';
}

function ler<T>(chave: string, parse: (data: unknown) => T, maxAgeMs: number): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const bruto = sessionStorage.getItem(chave);
    if (!bruto) return undefined;
    const parsed: unknown = JSON.parse(bruto);
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed) || !('at' in parsed)) {
      return undefined;
    }
    const { data, at } = parsed as { data: unknown; at: number };
    if (Date.now() - at > maxAgeMs) return undefined;
    return parse(data);
  } catch {
    return undefined;
  }
}

function gravar(chave: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(chave, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // quota
  }
}

const MAX_AGE = 30 * 60 * 1000;

export function lerCacheNoticiasAdmin(): NoticiaListagem[] | undefined {
  return ler(
    `sindprf:admin-noticias:${hostAtual()}`,
    (data) => z.array(noticiaListagemSchema).parse(data),
    MAX_AGE,
  );
}

export function gravarCacheNoticiasAdmin(data: NoticiaListagem[]): void {
  gravar(`sindprf:admin-noticias:${hostAtual()}`, data);
}

export function lerCacheConveniosAdmin(): ConvenioListagem[] | undefined {
  return ler(
    `sindprf:admin-convenios:${hostAtual()}`,
    (data) => z.array(convenioListagemSchema).parse(data),
    MAX_AGE,
  );
}

export function gravarCacheConveniosAdmin(data: ConvenioListagem[]): void {
  gravar(`sindprf:admin-convenios:${hostAtual()}`, data);
}

export function lerCacheAfiliadosAdmin(filtroKey: string): AfiliadosAdminPaginados | undefined {
  return ler(
    `sindprf:admin-afiliados:${hostAtual()}:${filtroKey}`,
    (data) => afiliadosAdminPaginadosSchema.parse(data),
    MAX_AGE,
  );
}

export function gravarCacheAfiliadosAdmin(filtroKey: string, data: AfiliadosAdminPaginados): void {
  gravar(`sindprf:admin-afiliados:${hostAtual()}:${filtroKey}`, data);
}

export function limparCachesAdmin(): void {
  if (typeof window === 'undefined') return;
  try {
    const prefixos = [
      `sindprf:admin-noticias:${hostAtual()}`,
      `sindprf:admin-convenios:${hostAtual()}`,
      `sindprf:admin-afiliados:${hostAtual()}:`,
    ];
    const remover: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (prefixos.some((p) => k === p || k.startsWith(p))) remover.push(k);
    }
    for (const k of remover) sessionStorage.removeItem(k);
  } catch {
    // ignora
  }
}
