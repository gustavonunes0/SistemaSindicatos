/** Ordena nomes com números embutidos (Foto_01, Foto_02, Foto_10). */
export function compararNomeArquivo(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export function ordenarArquivosPorNome(arquivos: File[]): File[] {
  return [...arquivos].sort((a, b) => compararNomeArquivo(a.name, b.name));
}

export function moverItem<T>(lista: T[], de: number, para: number): T[] {
  if (de === para || de < 0 || para < 0 || de >= lista.length || para >= lista.length) {
    return lista;
  }
  const proxima = [...lista];
  const [item] = proxima.splice(de, 1);
  if (!item) return lista;
  proxima.splice(para, 0, item);
  return proxima;
}
