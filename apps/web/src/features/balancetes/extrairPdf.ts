import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

type ItemTexto = {
  str: string;
  x: number;
  y: number;
};

/**
 * Extrai texto do PDF Fortes preservando linhas (agrupa itens pela coordenada Y).
 * Necessário para o parser reconhecer código + descrição + saldos.
 */
export async function extrairTextoBalancetePdf(arquivo: File): Promise<string> {
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const documento = await getDocument({ data: dados, useSystemFonts: true }).promise;
  const paginas: string[] = [];

  for (let pagina = 1; pagina <= documento.numPages; pagina += 1) {
    const page = await documento.getPage(pagina);
    const content = await page.getTextContent();
    const itens: ItemTexto[] = content.items
      .filter((item): item is typeof item & { str: string; transform: number[] } =>
        'str' in item && typeof item.str === 'string' && Array.isArray(item.transform),
      )
      .map((item) => ({
        str: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
      }))
      .filter((item) => item.str.trim().length > 0);

    itens.sort((a, b) => b.y - a.y || a.x - b.x);

    const linhas: Array<{ y: number; partes: string[] }> = [];
    for (const item of itens) {
      const atual = linhas[linhas.length - 1];
      if (!atual || Math.abs(atual.y - item.y) > 2.5) {
        linhas.push({ y: item.y, partes: [item.str] });
      } else {
        atual.partes.push(item.str);
      }
    }

    paginas.push(linhas.map((linha) => linha.partes.join(' ').replace(/\s+/g, ' ').trim()).join('\n'));
  }

  await documento.destroy();
  return paginas.join('\n');
}
