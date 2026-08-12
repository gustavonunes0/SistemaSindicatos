import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AtualizarEleicaoInput, CriarEleicaoInput } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { serializarEleicaoDetalhe, serializarEleicaoResumo } from './eleicao.util';

const includeChapasComCandidatos = {
  chapas: {
    orderBy: { numero: 'asc' as const },
    include: {
      candidatos: {
        select: {
          id: true,
          chapaId: true,
          nome: true,
          cargo: true,
          fotoUrl: true,
        },
      },
    },
  },
} satisfies Prisma.EleicaoInclude;

const CAMPOS_LISTAGEM_ADMIN = {
  id: true,
  titulo: true,
  descricao: true,
  inicio: true,
  fim: true,
  status: true,
  resolvidaPorAclamacao: true,
} as const;

@Injectable()
export class EleicaoService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(input: CriarEleicaoInput) {
    const eleicao = await this.prisma.eleicao.create({
      data: {
        tenantId: requireTenantId(),
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        inicio: input.inicio,
        fim: input.fim,
        inscricaoInicio: input.inscricaoInicio ?? null,
        inscricaoFim: input.inscricaoFim ?? null,
      },
    });
    return serializarEleicaoResumo(eleicao);
  }

  async atualizar(id: string, input: AtualizarEleicaoInput) {
    const dados: Prisma.EleicaoUpdateInput = {};
    if (input.titulo !== undefined) dados.titulo = input.titulo;
    if (input.descricao !== undefined) dados.descricao = input.descricao;
    if (input.inicio !== undefined) dados.inicio = input.inicio;
    if (input.fim !== undefined) dados.fim = input.fim;
    if (input.inscricaoInicio !== undefined) dados.inscricaoInicio = input.inscricaoInicio;
    if (input.inscricaoFim !== undefined) dados.inscricaoFim = input.inscricaoFim;

    try {
      const atualizada = await this.prisma.eleicao.update({
        where: { id, status: 'AGENDADA' },
        data: dados,
      });
      return serializarEleicaoResumo(atualizada);
    } catch (error) {
      throw await this.explicarFalhaDeStatus(
        error,
        id,
        'Só é possível editar uma eleição enquanto AGENDADA',
      );
    }
  }

  async remover(id: string): Promise<void> {
    try {
      await this.prisma.eleicao.delete({ where: { id, status: 'AGENDADA' } });
    } catch (error) {
      throw await this.explicarFalhaDeStatus(
        error,
        id,
        'Só é possível remover uma eleição enquanto AGENDADA',
      );
    }
  }

  async listarAdmin() {
    const lista = await this.prisma.eleicao.findMany({
      orderBy: { createdAt: 'desc' },
      select: CAMPOS_LISTAGEM_ADMIN,
    });
    return lista.map(serializarEleicaoResumo);
  }

  async buscarAdminDetalhe(id: string) {
    const [eleicao, totalElegiveis, totalComparecimentos] = await Promise.all([
      this.prisma.eleicao.findUnique({
        where: { id },
        include: includeChapasComCandidatos,
      }),
      this.prisma.elegivel.count({ where: { eleicaoId: id } }),
      this.prisma.comparecimento.count({ where: { eleicaoId: id } }),
    ]);
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }

    return {
      ...serializarEleicaoDetalhe(eleicao),
      inscricaoInicio: eleicao.inscricaoInicio,
      inscricaoFim: eleicao.inscricaoFim,
      totalElegiveis,
      totalComparecimentos,
    };
  }

  async listarVisiveis() {
    const lista = await this.prisma.eleicao.findMany({
      orderBy: { inicio: 'desc' },
      select: CAMPOS_LISTAGEM_ADMIN,
    });
    return lista.map(serializarEleicaoResumo);
  }

  async buscarDetalhePublico(id: string) {
    const eleicao = await this.prisma.eleicao.findUnique({
      where: { id },
      include: includeChapasComCandidatos,
    });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    return serializarEleicaoDetalhe(eleicao);
  }

  async abrir(id: string) {
    const agora = new Date();
    // As três checagens são independentes entre si.
    const [eleicao, chapaPendente, contestacaoPendente] = await Promise.all([
      this.prisma.eleicao.findUnique({ where: { id }, select: { status: true } }),
      this.prisma.chapa.findFirst({
        where: { eleicaoId: id, status: 'INSCRITA' },
        select: { id: true },
      }),
      this.prisma.contestacaoChapa.findFirst({
        where: {
          status: 'ABERTA',
          chapa: { eleicaoId: id, prazoContestacaoFim: { gt: agora } },
        },
        select: { id: true },
      }),
    ]);

    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    if (eleicao.status !== 'AGENDADA') {
      throw new ConflictException('Só é possível abrir uma eleição AGENDADA');
    }
    if (chapaPendente) {
      throw new ConflictException(
        'Existem chapas ainda não homologadas. Decida a homologação antes de abrir a votação.',
      );
    }
    if (contestacaoPendente) {
      throw new ConflictException(
        'Existem impugnações/recursos em aberto dentro do prazo. Resolva antes de abrir a votação.',
      );
    }

    const atualizada = await this.prisma.eleicao.update({
      where: { id },
      data: { status: 'ABERTA' },
    });
    return serializarEleicaoResumo(atualizada);
  }

  async encerrar(id: string) {
    try {
      const atualizada = await this.prisma.eleicao.update({
        where: { id, status: 'ABERTA' },
        data: { status: 'ENCERRADA' },
      });
      return serializarEleicaoResumo(atualizada);
    } catch (error) {
      throw await this.explicarFalhaDeStatus(
        error,
        id,
        'Só é possível encerrar uma eleição ABERTA',
      );
    }
  }

  async buscarOuFalhar(id: string) {
    const eleicao = await this.prisma.eleicao.findUnique({ where: { id } });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    return eleicao;
  }

  /**
   * O write filtrado por status resolve tudo em uma consulta, mas o P2025 não
   * diz se a eleição não existe ou se está no status errado. Só o caminho de
   * erro paga a consulta extra para montar a mensagem certa.
   */
  private async explicarFalhaDeStatus(
    error: unknown,
    id: string,
    mensagemDeStatus: string,
  ): Promise<unknown> {
    const naoAtingiu =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
    if (!naoAtingiu) {
      return error;
    }

    const existe = await this.prisma.eleicao.findUnique({
      where: { id },
      select: { id: true },
    });
    return existe
      ? new ConflictException(mensagemDeStatus)
      : new NotFoundException('Eleição não encontrada');
  }
}
