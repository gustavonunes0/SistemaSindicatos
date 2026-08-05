/** @deprecated Preferir `useMarca().diretoria` — tipos reexportados de @sindprf/types. */
export type { BlocoDiretoria, MembroDiretoria, DiretoriaBranding as Diretoria } from '@sindprf/types';

import { marcaFallback } from './marca';

/** Fallback estático (só se branding do tenant não tiver diretoria). */
export const diretoria = marcaFallback.diretoria!;
