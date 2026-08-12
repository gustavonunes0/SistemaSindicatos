import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  AtualizarStatusSolicitacaoInput,
  CriarSolicitacaoInput,
  EnviarMensagemInput,
  FiltroSolicitacoesAdminInput,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { whereSobreposicao } from '../imoveis/imoveis.util';
import type { RequestUser } from '../common/request-user';
import { requireTenantId } from '../tenant/tenant-context';
import {
  serializarMensagem,
  serializarSolicitacao,
  serializarSolicitacaoResumo,
} from './solicitacoes.util';

const includeResumo = {
  imovel: { select: { id: true, titulo: true } },
  afiliado: { select: { id: true, nome: true } },
  _count: { select: { mensagens: true } },
} as const;

const includeMensagemAutor = {
  autor: {
    select: {
      id: true,
      role: true,
      afiliado: { select: { nome: true } },
    },
  },
} as const;

@Injectable()
export class SolicitacoesService {
  private readonly logger = new Logger(SolicitacoesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async criar(user: RequestUser, input: CriarSolicitacaoInput) {
    const [afiliado, imovel, conflitos] = await Promise.all([
      this.buscarAfiliadoAprovado(user.id),
      this.prisma.imovel.findUnique({
        where: { id: input.imovelId },
        select: { id: true, titulo: true, ativo: true },
      }),
      this.prisma.periodo.findMany({
        where: {
          imovelId: input.imovelId,
          ...whereSobreposicao(input.inicioDesejado, input.fimDesejado),
        },
        select: { id: true },
      }),
    ]);

    if (!imovel?.ativo) {
      throw new NotFoundException('Imóvel não encontrado');
    }
    if (conflitos.length > 0) {
      throw new ConflictException('O período desejado não está disponível');
    }

    const tenantId = requireTenantId();
    const textoInicial =
      input.mensagemInicial?.trim() ||
      `Solicitação de locação de ${input.inicioDesejado.toLocaleDateString('pt-BR')} a ${input.fimDesejado.toLocaleDateString('pt-BR')}.`;

    // Write aninhado: solicitação e mensagem inicial numa só viagem.
    const solicitacao = await this.prisma.solicitacaoAluguel.create({
      data: {
        tenantId,
        imovelId: input.imovelId,
        afiliadoId: afiliado.id,
        inicioDesejado: input.inicioDesejado,
        fimDesejado: input.fimDesejado,
        mensagens: {
          create: { tenantId, autorId: user.id, texto: textoInicial },
        },
      },
    });

    this.logger.log(
      `Nova solicitação de aluguel ${solicitacao.id} — imóvel "${imovel.titulo}" por ${afiliado.nome}`,
    );

    return serializarSolicitacao(solicitacao);
  }

  async listarMinhas(user: RequestUser) {
    const afiliado = await this.buscarAfiliadoAprovado(user.id);
    const lista = await this.prisma.solicitacaoAluguel.findMany({
      where: { afiliadoId: afiliado.id },
      include: includeResumo,
      orderBy: { updatedAt: 'desc' },
    });
    return lista.map(serializarSolicitacaoResumo);
  }

  async listarAdmin(filtro: FiltroSolicitacoesAdminInput) {
    const lista = await this.prisma.solicitacaoAluguel.findMany({
      where: filtro.status ? { status: filtro.status } : undefined,
      include: includeResumo,
      orderBy: { updatedAt: 'desc' },
    });
    return lista.map(serializarSolicitacaoResumo);
  }

  async buscar(user: RequestUser, id: string) {
    const [solicitacao, afiliado] = await Promise.all([
      this.prisma.solicitacaoAluguel.findUnique({
        where: { id },
        include: includeResumo,
      }),
      this.carregarAfiliadoParaAcesso(user),
    ]);
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    this.garantirAcesso(user, afiliado, solicitacao.afiliadoId);
    return serializarSolicitacaoResumo(solicitacao);
  }

  async atualizarStatus(user: RequestUser, id: string, input: AtualizarStatusSolicitacaoInput) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    try {
      const solicitacao = await this.prisma.solicitacaoAluguel.update({
        where: { id },
        data: { status: input.status },
        include: includeResumo,
      });
      return serializarSolicitacaoResumo(solicitacao);
    } catch {
      throw new NotFoundException('Solicitação não encontrada');
    }
  }

  async listarMensagens(user: RequestUser, solicitacaoId: string) {
    const [solicitacao, afiliado, mensagens] = await Promise.all([
      this.prisma.solicitacaoAluguel.findUnique({
        where: { id: solicitacaoId },
        select: { afiliadoId: true },
      }),
      this.carregarAfiliadoParaAcesso(user),
      this.prisma.mensagem.findMany({
        where: { solicitacaoId },
        include: includeMensagemAutor,
        orderBy: { criadoEm: 'asc' },
      }),
    ]);
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    this.garantirAcesso(user, afiliado, solicitacao.afiliadoId);

    return mensagens.map(serializarMensagem);
  }

  async enviarMensagem(user: RequestUser, solicitacaoId: string, input: EnviarMensagemInput) {
    const [solicitacao, afiliado] = await Promise.all([
      this.prisma.solicitacaoAluguel.findUnique({
        where: { id: solicitacaoId },
        select: { afiliadoId: true, status: true, imovel: { select: { titulo: true } } },
      }),
      this.carregarAfiliadoParaAcesso(user),
    ]);
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    this.garantirAcesso(user, afiliado, solicitacao.afiliadoId);

    if (solicitacao.status === 'FECHADA') {
      throw new ConflictException('Esta solicitação está encerrada');
    }

    const novoStatus =
      user.role === 'ADMIN' && solicitacao.status === 'ABERTA'
        ? 'EM_ANDAMENTO'
        : solicitacao.status;

    const [mensagem] = await this.prisma.$transaction([
      this.prisma.mensagem.create({
        data: {
          tenantId: requireTenantId(),
          solicitacaoId,
          autorId: user.id,
          texto: input.texto.trim(),
        },
        include: includeMensagemAutor,
      }),
      this.prisma.solicitacaoAluguel.update({
        where: { id: solicitacaoId },
        data: { status: novoStatus },
      }),
    ]);

    if (user.role === 'ADMIN') {
      this.logger.log(
        `Admin respondeu solicitação ${solicitacaoId} (imóvel "${solicitacao.imovel.titulo}")`,
      );
    }

    return serializarMensagem(mensagem);
  }

  private async buscarAfiliadoAprovado(userId: string) {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId },
      select: { id: true, nome: true, status: true },
    });
    if (afiliado?.status !== 'APROVADO') {
      throw new ForbiddenException('Afiliação ainda não aprovada');
    }
    return afiliado;
  }

  /**
   * O afiliado do usuário não depende da solicitação, então pode ser carregado
   * em paralelo com ela; a comparação de dono fica sem custo de rede.
   */
  private carregarAfiliadoParaAcesso(user: RequestUser) {
    return user.role === 'ADMIN' ? Promise.resolve(null) : this.buscarAfiliadoAprovado(user.id);
  }

  private garantirAcesso(
    user: RequestUser,
    afiliado: { id: string } | null,
    afiliadoId: string,
  ): void {
    if (user.role === 'ADMIN') {
      return;
    }
    if (afiliado?.id !== afiliadoId) {
      throw new ForbiddenException('Acesso negado');
    }
  }
}
