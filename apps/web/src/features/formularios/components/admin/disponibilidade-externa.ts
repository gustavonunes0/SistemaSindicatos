import type { PublicoFormulario, StatusFormulario } from '@sindprf/types';

/**
 * Um link do Google nasce só como registro do painel. Publicar e escolher o
 * público são a mesma decisão para quem cadastra ("quem enxerga isto?"), então
 * a tela usa um controle único e traduz para os dois campos do formulário.
 */
export type DisponibilidadeExterna = 'PAINEL' | 'FILIADOS' | 'ABERTO';

export const DISPONIBILIDADE_EXTERNA_ROTULO: Record<DisponibilidadeExterna, string> = {
  PAINEL: 'Somente no painel',
  FILIADOS: 'Filiados aprovados',
  ABERTO: 'Qualquer pessoa com o link',
};

type Compartilhamento = { status: StatusFormulario; publico: PublicoFormulario };

export function paraCompartilhamento(
  disponibilidade: DisponibilidadeExterna,
): Compartilhamento {
  if (disponibilidade === 'PAINEL') {
    return { status: 'RASCUNHO', publico: 'FILIADOS' };
  }
  return {
    status: 'PUBLICADO',
    publico: disponibilidade === 'ABERTO' ? 'TODOS' : 'FILIADOS',
  };
}

export function paraDisponibilidade(valores: Compartilhamento): DisponibilidadeExterna {
  if (valores.status !== 'PUBLICADO') return 'PAINEL';
  return valores.publico === 'TODOS' ? 'ABERTO' : 'FILIADOS';
}

export function rotuloDisponibilidade(valores: Compartilhamento): string {
  if (valores.status === 'ENCERRADO') return 'Encerrado';
  return DISPONIBILIDADE_EXTERNA_ROTULO[paraDisponibilidade(valores)];
}
