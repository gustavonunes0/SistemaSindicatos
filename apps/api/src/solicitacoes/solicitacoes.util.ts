import type {
  Mensagem,
  PerfilHospedagemPedido,
  SolicitacaoAluguel,
  SolicitacaoResumo,
} from '@sindprf/types';
import { PERFIL_HOSPEDAGEM_PEDIDO_ROTULO } from '@sindprf/types';
import type { Mensagem as MensagemPrisma, Role, SolicitacaoAluguel as SolicitacaoPrisma } from '@prisma/client';

type SolicitacaoComRelacoes = SolicitacaoPrisma & {
  imovel: { id: string; titulo: string };
  afiliado: { id: string; nome: string } | null;
  _count: { mensagens: number };
};

type MensagemComAutor = MensagemPrisma & {
  autor: { id: string; role: Role; afiliado: { nome: string } | null };
};

function perfilPedido(valor: string): PerfilHospedagemPedido {
  if (valor === 'FILIADO_OUTRO' || valor === 'NAO_FILIADO' || valor === 'FILIADO_SINDPRF') {
    return valor;
  }
  return 'FILIADO_SINDPRF';
}

export function nomeSolicitanteExibicao(solicitacao: {
  afiliado: { nome: string } | null;
  solicitanteNome: string | null;
  perfilHospedagem: string;
}): string {
  if (solicitacao.afiliado?.nome) {
    return solicitacao.afiliado.nome;
  }
  if (solicitacao.solicitanteNome?.trim()) {
    return solicitacao.solicitanteNome.trim();
  }
  return PERFIL_HOSPEDAGEM_PEDIDO_ROTULO[perfilPedido(solicitacao.perfilHospedagem)];
}

export function serializarSolicitacao(solicitacao: SolicitacaoPrisma): SolicitacaoAluguel {
  return {
    id: solicitacao.id,
    imovelId: solicitacao.imovelId,
    afiliadoId: solicitacao.afiliadoId,
    perfilHospedagem: perfilPedido(solicitacao.perfilHospedagem),
    solicitanteNome: solicitacao.solicitanteNome,
    solicitanteCpf: solicitacao.solicitanteCpf,
    solicitanteEmail: solicitacao.solicitanteEmail,
    solicitanteTelefone: solicitacao.solicitanteTelefone,
    sindicatoOrigem: solicitacao.sindicatoOrigem,
    acompanhantes: solicitacao.acompanhantes,
    observacoes: solicitacao.observacoes,
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
    solicitanteExibicao: nomeSolicitanteExibicao(solicitacao),
    totalMensagens: solicitacao._count.mensagens,
  };
}

export function serializarMensagem(mensagem: MensagemComAutor): Mensagem {
  const autorNome =
    mensagem.autor.role === 'AFILIADO'
      ? (mensagem.autor.afiliado?.nome ?? 'Afiliado')
      : 'Administração';

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
