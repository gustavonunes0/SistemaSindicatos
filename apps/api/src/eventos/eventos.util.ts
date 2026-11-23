import type { Evento, FotoEvento } from '@prisma/client';

export type EventoComFotos = Evento & { fotos: FotoEvento[] };

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
