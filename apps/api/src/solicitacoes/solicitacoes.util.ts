import type { Mensagem, SolicitacaoAluguel, SolicitacaoResumo } from '@sindprf/types';
import type { Mensagem as MensagemPrisma, SolicitacaoAluguel as SolicitacaoPrisma } from '@prisma/client';

type SolicitacaoComRelacoes = SolicitacaoPrisma & {
  imovel: { id: string; titulo: string };
  afiliado: { id: string; nome: string };
  _count: { mensagens: number };
};

type MensagemComAutor = MensagemPrisma & {
  autor: { id: string; role: 'ADMIN' | 'AFILIADO'; afiliado: { nome: string } | null };
};

export function serializarSolicitacao(solicitacao: SolicitacaoPrisma): SolicitacaoAluguel {
  return {
    id: solicitacao.id,
    imovelId: solicitacao.imovelId,
    afiliadoId: solicitacao.afiliadoId,
    inicioDesejado: solicitacao.inicioDesejado,
    fimDesejado: solicitacao.fimDesejado,
    status: solicitacao.status,
    createdAt: solicitacao.createdAt,
    updatedAt: solicitacao.updatedAt,
  };
}

export function serializarSolicitacaoResumo(solicitacao: SolicitacaoComRelacoes): SolicitacaoResumo {
  return {
    ...serializarSolicitacao(solicitacao),
    imovel: solicitacao.imovel,
    afiliado: solicitacao.afiliado,
    totalMensagens: solicitacao._count.mensagens,
  };
}

export function serializarMensagem(mensagem: MensagemComAutor): Mensagem {
  const autorNome =
    mensagem.autor.role === 'ADMIN'
      ? 'Administração'
      : (mensagem.autor.afiliado?.nome ?? 'Afiliado');

  return {
    id: mensagem.id,
    solicitacaoId: mensagem.solicitacaoId,
    autorId: mensagem.autorId,
    texto: mensagem.texto,
    criadoEm: mensagem.criadoEm,
    autorNome,
    autorRole: mensagem.autor.role,
  };
}
