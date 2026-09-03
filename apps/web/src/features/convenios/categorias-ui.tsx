import type { ReactNode } from 'react';
import type { CategoriaConvenio } from './categorias';

export const META_CATEGORIA: Record<
  CategoriaConvenio,
  { subtitulo: string; tom: 'educacao' | 'saude' | 'lazer' | 'servicos' }
> = {
  Educação: { subtitulo: 'Faculdades, cursos e escolas', tom: 'educacao' },
  Saúde: { subtitulo: 'Clínicas, exames e bem-estar', tom: 'saude' },
  'Esporte e Lazer': { subtitulo: 'Hotéis, clubes e turismo', tom: 'lazer' },
  'Serviços e Facilidades': { subtitulo: 'Praticidade no dia a dia', tom: 'servicos' },
};

export function IlustracaoCategoria({ categoria }: { categoria: CategoriaConvenio }): ReactNode {
  if (categoria === 'Saúde') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
        <circle cx="40" cy="40" r="34" fill="#FEE2E2" />
        <path
          fill="#DC2626"
          d="M40 58c-9.5-7.4-16-13.2-16-20.2 0-4.7 3.6-8.3 8.2-8.3 2.6 0 5.1 1.2 6.8 3.2 1.7-2 4.2-3.2 6.8-3.2 4.6 0 8.2 3.6 8.2 8.3 0 7-6.5 12.8-16 20.2z"
        />
        <rect x="36.5" y="28" width="7" height="18" rx="1.5" fill="#fff" />
        <rect x="31" y="33.5" width="18" height="7" rx="1.5" fill="#fff" />
      </svg>
    );
  }

  if (categoria === 'Educação') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
        <circle cx="40" cy="40" r="34" fill="#DBEAFE" />
        <path fill="#1D4ED8" d="M40 22 16 34l24 12 24-12-24-12z" />
        <path fill="#2563EB" d="M24 40.5v10.2L40 58l16-7.3V40.5L40 48.2 24 40.5z" />
        <path fill="#93C5FD" d="M60 36.5v12.8h4V38.2l-4-1.7z" />
        <rect x="28" y="52" width="24" height="3" rx="1.5" fill="#1E3A8A" opacity=".35" />
      </svg>
    );
  }

  if (categoria === 'Esporte e Lazer') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
        <circle cx="40" cy="40" r="34" fill="#DCFCE7" />
        <path
          fill="#16A34A"
          d="M40 18c-9.4 0-17 7.6-17 17 0 12.8 17 27 17 27s17-14.2 17-27c0-9.4-7.6-17-17-17zm0 23.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"
        />
        <path
          fill="#86EFAC"
          d="M40 22.5c-6.9 0-12.5 5.6-12.5 12.5 0 1.1.1 2.2.4 3.2A9.5 9.5 0 0 1 40 29.5a9.5 9.5 0 0 1 12.1 8.7c.3-1 .4-2.1.4-3.2 0-6.9-5.6-12.5-12.5-12.5z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="34" fill="#FEF3C7" />
      <rect x="24" y="28" width="32" height="26" rx="3" fill="#D97706" />
      <rect x="28" y="32" width="10" height="8" rx="1.5" fill="#FDE68A" />
      <rect x="42" y="32" width="10" height="8" rx="1.5" fill="#FDE68A" />
      <rect x="28" y="44" width="10" height="6" rx="1.5" fill="#FDE68A" />
      <rect x="42" y="44" width="10" height="6" rx="1.5" fill="#FDE68A" />
      <path fill="#92400E" d="M36 54h8v4h-8z" />
    </svg>
  );
}
