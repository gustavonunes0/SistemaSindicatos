import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extrairTextoPdf(arquivo: File): Promise<string> {
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const documento = await getDocument({ data: dados, useSystemFonts: true }).promise;
  const partes: string[] = [];

  for (let pagina = 1; pagina <= documento.numPages; pagina += 1) {
    const page = await documento.getPage(pagina);
    const content = await page.getTextContent();
    const texto = content.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    partes.push(texto);
  }

  await documento.destroy();
  return partes.join('\n');
}
