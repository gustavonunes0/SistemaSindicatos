import type { Evento, FotoEvento } from '@prisma/client';

export type EventoComFotos = Evento & { fotos: FotoEvento[] };

/** Ordena nomes com números embutidos (Foto_01, Foto_02, Foto_10). */
export function compararNomeArquivo(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export function ordenarPorNomeArquivo<T extends { nomeOriginal: string }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => compararNomeArquivo(a.nomeOriginal, b.nomeOriginal));
}

export function serializarEvento(evento: EventoComFotos) {
  return {
    id: evento.id,
    titulo: evento.titulo,
    descricao: evento.descricao,
    local: evento.local,
    dataEvento: evento.dataEvento,
    ativo: evento.ativo,
    createdAt: evento.createdAt,
    updatedAt: evento.updatedAt,
    fotos: [...evento.fotos]
      .sort((a, b) => a.ordem - b.ordem)
      .map((foto) => ({
        id: foto.id,
        eventoId: foto.eventoId,
        url: foto.url,
        nomeOriginal: foto.nomeOriginal,
        ordem: foto.ordem,
      })),
  };
}
