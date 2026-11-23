import { urlDaApi } from '../../lib/urls';

/** Baixa a imagem forçando o download, mesmo quando a API está em outro host. */
export async function baixarImagem(url: string, nomeArquivo: string): Promise<void> {
  const resposta = await fetch(urlDaApi(url));
  if (!resposta.ok) {
    throw new Error('Não foi possível baixar a imagem');
  }
  const blob = await resposta.blob();
  const objeto = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objeto;
  link.download = nomeArquivo || 'foto-evento.jpg';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objeto);
}
