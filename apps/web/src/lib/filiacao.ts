import { marcaFallback } from './marca';

/** Fallback estático — preferir `useMarca().filiacao` + sede/contato da marca. */
export const filiacao = {
  sede: marcaFallback.sede,
  contato: marcaFallback.contato,
  formularios: marcaFallback.filiacao?.formularios ?? [],
  documentos: marcaFallback.filiacao?.documentos ?? [],
} as const;
