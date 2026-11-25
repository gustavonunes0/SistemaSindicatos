import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  AtualizarStatusSolicitacaoInput,
  CriarSolicitacaoInput,
  CriarSolicitacaoPublicaInput,
  EnviarMensagemInput,
  FiltroSolicitacoesAdminInput,
  PerfilHospedagem,
} from '@sindprf/types';
import { diasHospedagem, REGRAS_HOSPEDAGEM } from '@sindprf/types';
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
    const [afiliado, imovel] = await Promise.all([
      this.buscarAfiliadoAprovado(user.id),
      this.validarImovelEPeriodo(input.imovelId, input.inicioDesejado, input.fimDesejado),
    ]);

    this.validarLimiteContinuo('FILIADO_SINDPRF', input.inicioDesejado, input.fimDesejado);

    const tenantId = requireTenantId();
    const acompanhantes = input.acompanhantes.trim();
    const observacoes = input.mensagemInicial?.trim() || null;
    const dias = diasHospedagem(input.inicioDesejado, input.fimDesejado);
    const periodo = `${input.inicioDesejado.toLocaleDateString('pt-BR')} a ${input.fimDesejado.toLocaleDateString('pt-BR')}`;
    const textoInicial = [
      `Solicitação de hospedagem: ${periodo} (${dias} dia${dias === 1 ? '' : 's'}).`,
      `Acompanhantes: ${acompanhantes}`,
      observacoes ? `Observações: ${observacoes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const solicitacao = await this.prisma.solicitacaoAluguel.create({
      data: {
        tenantId,
        imovelId: input.imovelId,
        afiliadoId: afiliado.id,
        perfilHospedagem: 'FILIADO_SINDPRF',
        acompanhantes,
        observacoes,
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

  /** Pedido sem login — filiado de outro estado ou PRF não filiado. */
  async criarPublica(input: CriarSolicitacaoPublicaInput) {
    const imovel = await this.validarImovelEPeriodo(
      input.imovelId,
      input.inicioDesejado,
      input.fimDesejado,
    );

    this.validarLimiteContinuo(input.perfilHospedagem, input.inicioDesejado, input.fimDesejado);

    const tenantId = requireTenantId();
    const dias = diasHospedagem(input.inicioDesejado, input.fimDesejado);
    const solicitacao = await this.prisma.solicitacaoAluguel.create({
      data: {
        tenantId,
        imovelId: input.imovelId,
        afiliadoId: null,
        perfilHospedagem: input.perfilHospedagem,
        solicitanteNome: input.nome.trim(),
        solicitanteCpf: input.cpf,
        solicitanteEmail: input.email.trim().toLowerCase(),
        solicitanteTelefone: input.telefone.trim(),
        sindicatoOrigem:
          input.perfilHospedagem === 'FILIADO_OUTRO'
            ? input.sindicatoOrigem?.trim() || null
            : null,
        acompanhantes: input.acompanhantes.trim(),
        observacoes: input.observacoes?.trim() || null,
        inicioDesejado: input.inicioDesejado,
        fimDesejado: input.fimDesejado,
      },
    });

    this.logger.log(
      `Pedido público ${solicitacao.id} (${input.perfilHospedagem}, ${dias}d) — "${imovel.titulo}" por ${input.nome}`,
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

    if (input.status === 'APROVADA') {
      return this.aprovar(user, id);
    }
    if (input.status === 'RECUSADA') {
      return this.recusar(user, id);
    }

    const atual = await this.prisma.solicitacaoAluguel.findUnique({
      where: { id },
      select: { id: true, status: true, periodoId: true },
    });
    if (!atual) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    const solicitacao = await this.prisma.$transaction(async (tx) => {
      if (atual.periodoId && atual.status === 'APROVADA') {
        await tx.solicitacaoAluguel.update({
          where: { id },
          data: { periodoId: null },
        });
        await tx.periodo.delete({ where: { id: atual.periodoId } });
      }
      return tx.solicitacaoAluguel.update({
        where: { id },
        data: { status: input.status },
        include: includeResumo,
      });
    });

    return serializarSolicitacaoResumo(solicitacao);
  }

  /** Aprova a reserva e bloqueia o período no calendário do imóvel. */
  async aprovar(user: RequestUser, id: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    const atual = await this.prisma.solicitacaoAluguel.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        periodoId: true,
        imovelId: true,
        inicioDesejado: true,
        fimDesejado: true,
        imovel: { select: { titulo: true } },
      },
    });
    if (!atual) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    if (atual.status === 'APROVADA' && atual.periodoId) {
      const ja = await this.prisma.solicitacaoAluguel.findUnique({
        where: { id },
        include: includeResumo,
      });
      return serializarSolicitacaoResumo(ja!);
    }
    if (atual.status === 'FECHADA' || atual.status === 'RECUSADA') {
      throw new ConflictException('Esta solicitação já foi encerrada');
    }

    const conflitos = await this.prisma.periodo.findMany({
      where: {
        imovelId: atual.imovelId,
        ...whereSobreposicao(atual.inicioDesejado, atual.fimDesejado),
        ...(atual.periodoId ? { id: { not: atual.periodoId } } : {}),
      },
      select: { id: true },
    });
    if (conflitos.length > 0) {
      throw new ConflictException(
        'O período desejado conflita com outra reserva ou bloqueio no calendário',
      );
    }

    const tenantId = requireTenantId();
    const periodoTxt = `${atual.inicioDesejado.toLocaleDateString('pt-BR')} a ${atual.fimDesejado.toLocaleDateString('pt-BR')}`;

    const solicitacao = await this.prisma.$transaction(async (tx) => {
      let periodoId = atual.periodoId;
      if (!periodoId) {
        const periodo = await tx.periodo.create({
          data: {
            tenantId,
            imovelId: atual.imovelId,
            inicio: atual.inicioDesejado,
            fim: atual.fimDesejado,
            tipo: 'RESERVADO',
          },
        });
        periodoId = periodo.id;
      }

      await tx.mensagem.create({
        data: {
          tenantId,
          solicitacaoId: id,
          autorId: user.id,
          texto: `Reserva aprovada. Período ${periodoTxt} bloqueado no calendário.`,
        },
      });

      return tx.solicitacaoAluguel.update({
        where: { id },
        data: { status: 'APROVADA', periodoId },
        include: includeResumo,
      });
    });

    this.logger.log(
      `Reserva ${id} aprovada — imóvel "${atual.imovel.titulo}" (${periodoTxt})`,
    );
    return serializarSolicitacaoResumo(solicitacao);
  }

  /** Recusa a reserva e libera o período no calendário, se houver. */
  async recusar(user: RequestUser, id: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    const atual = await this.prisma.solicitacaoAluguel.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        periodoId: true,
        imovel: { select: { titulo: true } },
      },
    });
    if (!atual) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    if (atual.status === 'RECUSADA') {
      const ja = await this.prisma.solicitacaoAluguel.findUnique({
        where: { id },
        include: includeResumo,
      });
      return serializarSolicitacaoResumo(ja!);
    }
    if (atual.status === 'FECHADA') {
      throw new ConflictException('Esta solicitação já foi encerrada');
    }

    const solicitacao = await this.prisma.$transaction(async (tx) => {
      if (atual.periodoId) {
        await tx.solicitacaoAluguel.update({
          where: { id },
          data: { periodoId: null },
        });
        await tx.periodo.delete({ where: { id: atual.periodoId } });
      }

      await tx.mensagem.create({
        data: {
          tenantId: requireTenantId(),
          solicitacaoId: id,
          autorId: user.id,
          texto: 'Reserva recusada. O período permanece disponível no calendário.',
        },
      });

      return tx.solicitacaoAluguel.update({
        where: { id },
        data: { status: 'RECUSADA' },
        include: includeResumo,
      });
    });

    this.logger.log(`Reserva ${id} recusada — imóvel "${atual.imovel.titulo}"`);
    return serializarSolicitacaoResumo(solicitacao);
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

    // Pedido externo: só a administração registra anotações no histórico.
    if (!solicitacao.afiliadoId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    if (solicitacao.status === 'FECHADA' || solicitacao.status === 'RECUSADA') {
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

  private async validarImovelEPeriodo(imovelId: string, inicio: Date, fim: Date) {
    const [imovel, conflitos] = await Promise.all([
      this.prisma.imovel.findUnique({
        where: { id: imovelId },
        select: { id: true, titulo: true, ativo: true },
      }),
      this.prisma.periodo.findMany({
        where: {
          imovelId,
          ...whereSobreposicao(inicio, fim),
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
    return imovel;
  }

  private validarLimiteContinuo(perfil: PerfilHospedagem, inicio: Date, fim: Date) {
    const regras = REGRAS_HOSPEDAGEM[perfil];
    const dias = diasHospedagem(inicio, fim);
    if (dias < 1) {
      throw new BadRequestException('A estadia deve ter ao menos 1 dia');
    }
    if (dias > regras.maxContinuoDias) {
      throw new BadRequestException(
        `Pelo regulamento, a hospedagem contínua máxima é de ${regras.maxContinuoDias} dias`,
      );
    }
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
    afiliadoId: string | null,
  ): void {
    if (user.role === 'ADMIN') {
      return;
    }
    if (!afiliadoId || afiliado?.id !== afiliadoId) {
      throw new ForbiddenException('Acesso negado');
    }
  }
}
