import { Imovel, Periodo, Prisma } from '@prisma/client';

/** Dois intervalos [inicio, fim) se sobrepõem quando um começa antes do outro terminar. */
export function intervalosSobrepostos(
  aInicio: Date,
  aFim: Date,
  bInicio: Date,
  bFim: Date,
): boolean {
  return aInicio < bFim && bInicio < aFim;
}

export type ImovelComFotos = Imovel & { fotos: { id: string; imovelId: string; url: string; ordem: number }[] };

export function serializarImovel(imovel: ImovelComFotos) {
  return {
    ...imovel,
    valor: Number(imovel.valor),
    fotos: imovel.fotos.sort((a, b) => a.ordem - b.ordem),
  };
}

export function serializarPeriodo(periodo: Periodo) {
  return {
    id: periodo.id,
    imovelId: periodo.imovelId,
    inicio: periodo.inicio,
    fim: periodo.fim,
    tipo: periodo.tipo,
  };
}

export function whereSobreposicao(inicio: Date, fim: Date): Prisma.PeriodoWhereInput {
  return {
    inicio: { lt: fim },
    fim: { gt: inicio },
  };
}
