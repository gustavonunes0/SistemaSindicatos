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
    const afiliado = await this.buscarAfiliadoAprovado(user.id);

    const imovel = await this.prisma.imovel.findUnique({
      where: { id: input.imovelId },
      select: { id: true, titulo: true, ativo: true },
    });
    if (!imovel?.ativo) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    const conflitos = await this.prisma.periodo.findMany({
      where: {
        imovelId: input.imovelId,
        ...whereSobreposicao(input.inicioDesejado, input.fimDesejado),
      },
    });
    if (conflitos.length > 0) {
      throw new ConflictException('O período desejado não está disponível');
    }

    const solicitacao = await this.prisma.$transaction(async (tx) => {
      const tenantId = requireTenantId();
      const criada = await tx.solicitacaoAluguel.create({
        data: {
          tenantId,
          imovelId: input.imovelId,
          afiliadoId: afiliado.id,
          inicioDesejado: input.inicioDesejado,
          fimDesejado: input.fimDesejado,
        },
      });

      const textoInicial =
        input.mensagemInicial?.trim() ||
        `Solicitação de locação de ${input.inicioDesejado.toLocaleDateString('pt-BR')} a ${input.fimDesejado.toLocaleDateString('pt-BR')}.`;

      await tx.mensagem.create({
        data: {
          tenantId,
          solicitacaoId: criada.id,
          autorId: user.id,
          texto: textoInicial,
        },
      });

      return criada;
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
    const solicitacao = await this.prisma.solicitacaoAluguel.findUnique({
      where: { id },
      include: includeResumo,
    });
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    await this.garantirAcesso(user, solicitacao.afiliadoId);
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
    const solicitacao = await this.prisma.solicitacaoAluguel.findUnique({
      where: { id: solicitacaoId },
      select: { afiliadoId: true },
    });
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    await this.garantirAcesso(user, solicitacao.afiliadoId);

    const mensagens = await this.prisma.mensagem.findMany({
      where: { solicitacaoId },
      include: includeMensagemAutor,
      orderBy: { criadoEm: 'asc' },
    });
    return mensagens.map(serializarMensagem);
  }

  async enviarMensagem(user: RequestUser, solicitacaoId: string, input: EnviarMensagemInput) {
    const solicitacao = await this.prisma.solicitacaoAluguel.findUnique({
      where: { id: solicitacaoId },
      select: { afiliadoId: true, status: true, imovel: { select: { titulo: true } } },
    });
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    await this.garantirAcesso(user, solicitacao.afiliadoId);

    if (solicitacao.status === 'FECHADA') {
      throw new ConflictException('Esta solicitação está encerrada');
    }

    const mensagem = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.mensagem.create({
        data: {
          tenantId: requireTenantId(),
          solicitacaoId,
          autorId: user.id,
          texto: input.texto.trim(),
        },
        include: includeMensagemAutor,
      });

      const novoStatus =
        user.role === 'ADMIN' && solicitacao.status === 'ABERTA'
          ? 'EM_ANDAMENTO'
          : solicitacao.status;

      await tx.solicitacaoAluguel.update({
        where: { id: solicitacaoId },
        data: { status: novoStatus },
      });

      return criada;
    });

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

  private async garantirAcesso(user: RequestUser, afiliadoId: string) {
    if (user.role === 'ADMIN') {
      return;
    }
    const afiliado = await this.buscarAfiliadoAprovado(user.id);
    if (afiliado.id !== afiliadoId) {
      throw new ForbiddenException('Acesso negado');
    }
  }
}
