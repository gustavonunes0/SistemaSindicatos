import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { OrigemVoto, Prisma } from '@prisma/client';
import type {
  ComprovanteVoto,
  ContagemVotosEleicao,
  DefinirVotosPresenciaisInput,
  MeuStatusVotacao,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';

@Injectable()
export class VotacaoService {
  private readonly logger = new Logger(VotacaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async meuStatus(userId: string, eleicaoId: string): Promise<MeuStatusVotacao> {
    const afiliado = await this.buscarAfiliadoAprovado(userId);

    const [elegivel, comparecimento] = await Promise.all([
      this.prisma.elegivel.findUnique({
        where: { eleicaoId_afiliadoId: { eleicaoId, afiliadoId: afiliado.id } },
      }),
      this.prisma.comparecimento.findUnique({
        where: { eleicaoId_afiliadoId: { eleicaoId, afiliadoId: afiliado.id } },
      }),
    ]);

    return {
      elegivel: Boolean(elegivel),
      jaVotou: Boolean(comparecimento),
      protocolo: comparecimento?.protocolo ?? null,
      votouEm: comparecimento?.votouEm ?? null,
    };
  }

  // Núcleo crítico do módulo — ver .cursor/rules/eleicao.mdc.
  // Sigilo: Comparecimento e Voto são gravados na mesma transação, mas em
  // tabelas SEM relação entre si (Voto nunca referencia o afiliado).
  // Voto único: a constraint @@unique([eleicaoId, afiliadoId]) de
  // Comparecimento é a garantia real contra requisições concorrentes —
  // a checagem de elegibilidade abaixo é só uma otimização de UX.
  async votar(userId: string, eleicaoId: string, chapaId: string): Promise<ComprovanteVoto> {
    // Nenhuma das quatro checagens depende do resultado das outras.
    const [afiliado, eleicao, elegivel, chapa] = await Promise.all([
      this.prisma.afiliado.findUnique({
        where: { userId },
        select: { id: true, status: true },
      }),
      this.prisma.eleicao.findUnique({
        where: { id: eleicaoId },
        select: { status: true, inicio: true, fim: true },
      }),
      this.prisma.elegivel.findFirst({
        where: { eleicaoId, afiliado: { userId } },
        select: { id: true },
      }),
      this.prisma.chapa.findFirst({
        where: { id: chapaId, eleicaoId },
        select: { status: true },
      }),
    ]);

    if (afiliado?.status !== 'APROVADO') {
      throw new ForbiddenException('Afiliação ainda não aprovada');
    }
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    if (eleicao.status !== 'ABERTA') {
      throw new ConflictException('Esta eleição não está aberta para votação');
    }

    const agora = new Date();
    if (agora < eleicao.inicio || agora > eleicao.fim) {
      throw new ConflictException('Fora da janela de votação');
    }

    if (!elegivel) {
      throw new ForbiddenException('Você não está na lista de elegíveis desta eleição');
    }
    if (!chapa) {
      throw new NotFoundException('Chapa não encontrada nesta eleição');
    }
    if (chapa.status !== 'HOMOLOGADA') {
      throw new ConflictException('Esta chapa não está homologada');
    }

    const protocolo = randomBytes(16).toString('hex');
    const tenantId = requireTenantId();

    try {
      // Mesma transação atômica; tabelas seguem sem relação entre si.
      const [comparecimento] = await this.prisma.$transaction([
        this.prisma.comparecimento.create({
          data: { tenantId, eleicaoId, afiliadoId: afiliado.id, protocolo },
        }),
        this.prisma.voto.create({
          data: { tenantId, eleicaoId, chapaId, origem: OrigemVoto.ELETRONICO },
        }),
      ]);

      this.logger.log(`Comparecimento registrado na eleição ${eleicaoId} (protocolo ${protocolo})`);

      return { protocolo: comparecimento.protocolo, votouEm: comparecimento.votouEm };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Você já registrou seu voto nesta eleição');
      }
      throw error;
    }
  }

  async contagemVotos(eleicaoId: string): Promise<ContagemVotosEleicao> {
    const eleicao = await this.prisma.eleicao.findUnique({
      where: { id: eleicaoId },
      include: {
        chapas: {
          where: { status: 'HOMOLOGADA' },
          orderBy: { numero: 'asc' },
          select: { id: true, numero: true, nome: true },
        },
      },
    });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }

    const contagem = await this.prisma.voto.groupBy({
      by: ['chapaId', 'origem'],
      where: { eleicaoId },
      _count: { _all: true },
    });

    const mapa = new Map<string, { eletronicos: number; presenciais: number }>();
    for (const chapa of eleicao.chapas) {
      mapa.set(chapa.id, { eletronicos: 0, presenciais: 0 });
    }
    for (const item of contagem) {
      const atual = mapa.get(item.chapaId) ?? { eletronicos: 0, presenciais: 0 };
      if (item.origem === OrigemVoto.PRESENCIAL) {
        atual.presenciais = item._count._all;
      } else {
        atual.eletronicos = item._count._all;
      }
      mapa.set(item.chapaId, atual);
    }

    const chapas = eleicao.chapas.map((chapa) => {
      const totais = mapa.get(chapa.id) ?? { eletronicos: 0, presenciais: 0 };
      return {
        chapaId: chapa.id,
        numero: chapa.numero,
        nome: chapa.nome,
        eletronicos: totais.eletronicos,
        presenciais: totais.presenciais,
      };
    });

    return {
      eleicaoId,
      chapas,
      totalEletronicos: chapas.reduce((soma, item) => soma + item.eletronicos, 0),
      totalPresenciais: chapas.reduce((soma, item) => soma + item.presenciais, 0),
    };
  }

  // Cédulas em papel: totais por chapa, sem identificar o eleitor (mesma tabela
  // Voto, origem PRESENCIAL). Só a Comissão lança; substitui o lote anterior.
  async definirVotosPresenciais(
    eleicaoId: string,
    input: DefinirVotosPresenciaisInput,
  ): Promise<ContagemVotosEleicao> {
    const eleicao = await this.prisma.eleicao.findUnique({
      where: { id: eleicaoId },
      select: { status: true },
    });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    if (eleicao.status !== 'ABERTA' && eleicao.status !== 'ENCERRADA') {
      throw new ConflictException(
        'Só é possível lançar votos presenciais enquanto a votação está aberta ou após o encerramento, antes da apuração',
      );
    }

    const chapasHomologadas = await this.prisma.chapa.findMany({
      where: { eleicaoId, status: 'HOMOLOGADA' },
      select: { id: true },
    });
    const idsHomologadas = new Set(chapasHomologadas.map((chapa) => chapa.id));
    for (const lancamento of input.lancamentos) {
      if (!idsHomologadas.has(lancamento.chapaId)) {
        throw new ConflictException('Informe apenas chapas homologadas desta eleição');
      }
    }

    const tenantId = requireTenantId();
    const novosVotos = input.lancamentos.flatMap((lancamento) =>
      Array.from({ length: lancamento.quantidade }, () => ({
        tenantId,
        eleicaoId,
        chapaId: lancamento.chapaId,
        origem: OrigemVoto.PRESENCIAL,
      })),
    );

    await this.prisma.$transaction([
      this.prisma.voto.deleteMany({
        where: { eleicaoId, origem: OrigemVoto.PRESENCIAL },
      }),
      ...(novosVotos.length > 0
        ? [this.prisma.voto.createMany({ data: novosVotos })]
        : []),
    ]);

    this.logger.log(
      `Votos presenciais atualizados na eleição ${eleicaoId} (${novosVotos.length} cédulas)`,
    );

    return this.contagemVotos(eleicaoId);
  }

  private async buscarAfiliadoAprovado(userId: string) {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (afiliado?.status !== 'APROVADO') {
      throw new ForbiddenException('Afiliação ainda não aprovada');
    }
    return afiliado;
  }
}
