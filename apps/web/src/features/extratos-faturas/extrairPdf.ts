import type { ConteudoDocumentoFinanceiro, ItemPaginaFinanceira } from '@sindprf/types';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

function textoDaPagina(itens: ItemPaginaFinanceira[]): string {
  const linhas = new Map<number, ItemPaginaFinanceira[]>();
  for (const item of itens) {
    const y = Math.round((item.y ?? 0) / 2) * 2;
    linhas.set(y, [...(linhas.get(y) ?? []), item]);
  }
  return Array.from(linhas.entries())
    .sort(([yA], [yB]) => yB - yA)
    .map(([, itensLinha]) =>
      itensLinha
        .sort((a, b) => (a.x ?? 0) - (b.x ?? 0))
        .map((item) => item.texto)
        .join(' '),
    )
    .join('\n');
}

export async function extrairConteudoPdf(
  arquivo: File,
): Promise<ConteudoDocumentoFinanceiro> {
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const documento = await getDocument({ data: dados, useSystemFonts: true }).promise;
  const paginas: NonNullable<ConteudoDocumentoFinanceiro['paginas']> = [];

  try {
    for (let numero = 1; numero <= documento.numPages; numero += 1) {
      const pagina = await documento.getPage(numero);
      const conteudo = await pagina.getTextContent();
      const itens: ItemPaginaFinanceira[] = conteudo.items.flatMap((item) => {
        if (!('str' in item) || typeof item.str !== 'string' || !item.str.trim()) return [];
        return [{ texto: item.str, x: item.transform[4], y: item.transform[5] }];
      });
      paginas.push({ numero, texto: textoDaPagina(itens), itens });
    }
  } finally {
    await documento.destroy();
  }

  return { paginas };
}
