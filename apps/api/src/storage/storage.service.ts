// Abstração de storage de arquivos: a implementação local pode ser
// trocada por S3 (ou outro provider) sem tocar nos módulos consumidores.
export abstract class StorageService {
  abstract salvar(conteudo: Buffer, nomeOriginal: string): Promise<string>;
  /** Arquivo sensível, fora da pasta publicada pelo servidor web. */
  abstract salvarPrivado(conteudo: Buffer, nomeOriginal: string): Promise<string>;
  abstract lerPrivado(chave: string): Promise<Buffer>;
  abstract removerPrivado(chave: string): Promise<void>;
}
