export const CATEGORIAS_CONVENIO = [
  'Educação',
  'Saúde',
  'Esporte e Lazer',
  'Serviços e Facilidades',
] as const;

export type CategoriaConvenio = (typeof CATEGORIAS_CONVENIO)[number];

export function slugCategoriaConvenio(categoria: string): string {
  return categoria
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/** Mapeia categorias legadas do banco para as 4 oficiais. */
export function normalizarCategoriaConvenio(categoria: string): CategoriaConvenio {
  const chave = slugCategoriaConvenio(categoria);

  if (chave.includes('educ')) return 'Educação';
  if (/saude|odonto|medic|hospital|clinica/.test(chave)) return 'Saúde';
  if (/lazer|esporte|hotel|turismo|hospedagem|cultura/.test(chave)) {
    return 'Esporte e Lazer';
  }
  return 'Serviços e Facilidades';
}
