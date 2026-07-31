import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  FiltroLinhasD8,
  ImportacaoD8Detalhe,
  ImportarD8Resultado,
  TipoD8,
} from '@sindprf/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { parseTextoD8, type D8Parseado, type LinhaD8Parseada } from './d8-parser';

const BCRYPT_ROUNDS = 10;
const LOTE = 100;

type ResumoImport = {
  totalLinhas: number;
  totalValor: number;
  vinculados: number;
  semCadastro: number;
  criados: number;
  inativados: number;
  semDesconto: number;
};

type AfiliadoMatch = {
  id: string;
  userId: string;
  cpf: string;
  matricula: string;
  nome: string;
};

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

function paraNumero(valor: unknown): number {
  return Number(valor);
}

@Injectable()
export class D8Service {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.importacaoD8.findMany({
      orderBy: [{ competenciaAno: 'desc' }, { competenciaMes: 'desc' }, { tipo: 'asc' }],
    });
  }

  async detalhe(id: string): Promise<ImportacaoD8Detalhe> {
    const importacao = await this.prisma.importacaoD8.findUnique({ where: { id } });
    if (!importacao) {
      throw new NotFoundException('Importação D8 não encontrada');
    }

    const [vinculados, semCadastro, semDesconto] = await Promise.all([
      this.prisma.linhaD8.count({ where: { importacaoId: id, afiliadoId: { not: null } } }),
      this.prisma.linhaD8.count({ where: { importacaoId: id, afiliadoId: null } }),
      this.listarSemDesconto(importacao.competenciaAno, importacao.competenciaMes),
    ]);

    return {
      ...this.serializarImportacao(importacao),
      resumo: {
        totalLinhas: importacao.totalLinhas,
        totalValor: paraNumero(importacao.totalValor),
        vinculados,
        semCadastro,
        criados: 0,
        inativados: 0,
        semDesconto: semDesconto.length,
      },
      semDesconto,
    };
  }

  async listarLinhas(id: string, filtro: FiltroLinhasD8) {
    const importacao = await this.prisma.importacaoD8.findUnique({ where: { id } });
    if (!importacao) {
      throw new NotFoundException('Importação D8 não encontrada');
    }

    const linhas = (await this.prisma.linhaD8.findMany({
      where: {
        importacaoId: id,
        ...(filtro === 'semCadastro' ? { afiliadoId: null } : {}),
      },
      orderBy: { sequencia: 'asc' },
    })) as Array<{
      id: string;
      importacaoId: string;
      sequencia: number;
      matricula: string;
      nome: string;
      cpf: string;
      descricao: string;
      valor: unknown;
      afiliadoId: string | null;
    }>;

    return linhas.map((linha) => ({
      id: linha.id,
      importacaoId: linha.importacaoId,
      sequencia: linha.sequencia,
      matricula: linha.matricula,
      nome: linha.nome,
      cpf: linha.cpf,
      descricao: linha.descricao,
      valor: paraNumero(linha.valor),
      afiliadoId: linha.afiliadoId,
    }));
  }

  async importarTexto(input: {
    texto: string;
    tipo: TipoD8;
    substituirBase: boolean;
    arquivoNome: string;
  }): Promise<ImportarD8Resultado> {
    let parseado: D8Parseado;
    try {
      parseado = parseTextoD8(input.texto);
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'PDF D8 inválido';
      throw new BadRequestException(mensagem);
    }

    const { tipo, substituirBase, arquivoNome } = input;

    if (substituirBase) {
      await this.apagarAfiliados();
    }

    const existente = await this.prisma.importacaoD8.findUnique({
      where: {
        competenciaAno_competenciaMes_tipo: {
          competenciaAno: parseado.competenciaAno,
          competenciaMes: parseado.competenciaMes,
          tipo,
        },
      },
    });

    if (existente) {
      await this.prisma.linhaD8.deleteMany({ where: { importacaoId: existente.id } });
      await this.prisma.importacaoD8.delete({ where: { id: existente.id } });
    }

    const importacao = await this.prisma.importacaoD8.create({
      data: {
        competenciaAno: parseado.competenciaAno,
        competenciaMes: parseado.competenciaMes,
        tipo,
        arquivoNome,
        totalLinhas: parseado.linhas.length,
        totalValor: parseado.totalValor.toFixed(2),
      },
    });

    const { criados, vinculados } = await this.sincronizarAfiliados(parseado.linhas, tipo);

    const afiliadosCpf = await this.prisma.afiliado.findMany({
      where: { cpf: { in: parseado.linhas.map((l: LinhaD8Parseada) => l.cpf) } },
      select: { id: true, cpf: true },
    });
    const afiliadoPorCpf = new Map(
      afiliadosCpf.map((a: { id: string; cpf: string }) => [a.cpf, a.id]),
    );

    for (const lote of emLotes(parseado.linhas, LOTE)) {
      await this.prisma.linhaD8.createMany({
        data: lote.map((linha) => ({
          importacaoId: importacao.id,
          sequencia: linha.sequencia,
          matricula: linha.matricula,
          nome: linha.nome,
          cpf: linha.cpf,
          descricao: linha.descricao,
          valor: linha.valor.toFixed(2),
          afiliadoId: afiliadoPorCpf.get(linha.cpf) ?? null,
        })),
      });
    }

    const inativados = await this.inativarAusentes(
      parseado.competenciaAno,
      parseado.competenciaMes,
    );

    const semCadastro = parseado.linhas.length - vinculados;
    const semDesconto = await this.contarSemDesconto(
      parseado.competenciaAno,
      parseado.competenciaMes,
    );

    const resumo: ResumoImport = {
      totalLinhas: parseado.linhas.length,
      totalValor: parseado.totalValor,
      vinculados,
      semCadastro,
      criados,
      inativados,
      semDesconto,
    };

    return {
      importacao: this.serializarImportacao(importacao),
      resumo,
      // Login do afiliado: CPF + matrícula (senha = matrícula).
      senhaTemporariaUsada: false,
    };
  }

  private serializarImportacao(importacao: {
    id: string;
    competenciaAno: number;
    competenciaMes: number;
    tipo: TipoD8;
    arquivoNome: string;
    totalLinhas: number;
    totalValor: unknown;
    createdAt: Date;
  }) {
    return {
      id: importacao.id,
      competenciaAno: importacao.competenciaAno,
      competenciaMes: importacao.competenciaMes,
      tipo: importacao.tipo,
      arquivoNome: importacao.arquivoNome,
      totalLinhas: importacao.totalLinhas,
      totalValor: paraNumero(importacao.totalValor),
      createdAt: importacao.createdAt,
    };
  }

  private async apagarAfiliados(): Promise<void> {
    const afiliados = await this.prisma.afiliado.findMany({
      select: { id: true, userId: true },
    });
    if (afiliados.length === 0) return;

    const afiliadoIds = afiliados.map((a: { id: string; userId: string }) => a.id);
    const userIds = afiliados.map((a: { id: string; userId: string }) => a.userId);

    await this.prisma.linhaD8.updateMany({
      where: { afiliadoId: { in: afiliadoIds } },
      data: { afiliadoId: null },
    });
    await this.prisma.solicitacaoAluguel.deleteMany({ where: { afiliadoId: { in: afiliadoIds } } });
    await this.prisma.mensagem.deleteMany({ where: { autorId: { in: userIds } } });
    await this.prisma.user.deleteMany({ where: { id: { in: userIds }, role: 'AFILIADO' } });
  }

  private async sincronizarAfiliados(
    linhas: LinhaD8Parseada[],
    tipo: TipoD8,
  ): Promise<{ criados: number; vinculados: number }> {
    const cpfs = linhas.map((l) => l.cpf);
    const matriculas = linhas.map((l) => l.matricula);

    const existentes = await this.prisma.afiliado.findMany({
      where: {
        OR: [{ cpf: { in: cpfs } }, { matricula: { in: matriculas } }],
      },
      select: { id: true, userId: true, cpf: true, matricula: true, nome: true },
    });

    const porCpf = new Map<string, AfiliadoMatch>(
      existentes.map((a: AfiliadoMatch) => [a.cpf, a]),
    );
    const porMatricula = new Map<string, AfiliadoMatch>(
      existentes.map((a: AfiliadoMatch) => [a.matricula, a]),
    );

    const paraAtualizar: LinhaD8Parseada[] = [];
    const paraCriar: LinhaD8Parseada[] = [];

    for (const linha of linhas) {
      const porCpfMatch = porCpf.get(linha.cpf);
      const porMatMatch = porMatricula.get(linha.matricula);
      const afiliado = porCpfMatch ?? porMatMatch;

      if (afiliado) {
        if (porCpfMatch && porMatMatch && porCpfMatch.id !== porMatMatch.id) {
          throw new BadRequestException(
            `Conflito de cadastro: CPF ${linha.cpf} e matrícula ${linha.matricula} apontam para afiliados diferentes`,
          );
        }
        if (afiliado.matricula !== linha.matricula && porMatricula.has(linha.matricula)) {
          throw new BadRequestException(
            `Matrícula ${linha.matricula} já pertence a outro afiliado (CPF ${linha.cpf})`,
          );
        }
        paraAtualizar.push(linha);
        porCpf.set(linha.cpf, afiliado);
        porMatricula.set(linha.matricula, afiliado);
      } else {
        paraCriar.push(linha);
      }
    }

    for (const lote of emLotes(paraAtualizar, LOTE)) {
      await Promise.all(
        lote.map(async (linha) => {
          const afiliado = porCpf.get(linha.cpf) ?? porMatricula.get(linha.matricula);
          if (!afiliado) return;

          const matriculaMudou = afiliado.matricula !== linha.matricula;
          await this.prisma.afiliado.update({
            where: { id: afiliado.id },
            data: {
              nome: linha.nome,
              matricula: linha.matricula,
              cpf: linha.cpf,
              categoria: tipo,
              status: 'APROVADO',
            },
          });

          if (matriculaMudou) {
            const senhaHash = await bcrypt.hash(linha.matricula, BCRYPT_ROUNDS);
            await this.prisma.user.update({
              where: { id: afiliado.userId },
              data: { senhaHash },
            });
          }
        }),
      );
    }

    for (const lote of emLotes(paraCriar, LOTE)) {
      const usersData = await Promise.all(
        lote.map(async (linha) => ({
          email: `d8.${linha.cpf}@sindprf.local`,
          senhaHash: await bcrypt.hash(linha.matricula, BCRYPT_ROUNDS),
          role: 'AFILIADO' as const,
        })),
      );

      await this.prisma.user.createMany({
        data: usersData,
        skipDuplicates: true,
      });

      const emails = lote.map((linha) => `d8.${linha.cpf}@sindprf.local`);
      const users = await this.prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true },
      });
      const userPorEmail = new Map(
        users.map((u: { id: string; email: string }) => [u.email, u.id]),
      );

      await this.prisma.afiliado.createMany({
        data: lote.map((linha) => {
          const userId = userPorEmail.get(`d8.${linha.cpf}@sindprf.local`);
          if (!userId) {
            throw new BadRequestException(`Falha ao criar usuário para CPF ${linha.cpf}`);
          }
          return {
            userId,
            nome: linha.nome,
            cpf: linha.cpf,
            matricula: linha.matricula,
            categoria: tipo,
            status: 'APROVADO' as const,
          };
        }),
        skipDuplicates: true,
      });
    }

    return {
      criados: paraCriar.length,
      vinculados: paraAtualizar.length + paraCriar.length,
    };
  }

  private async inativarAusentes(
    competenciaAno: number,
    competenciaMes: number,
  ): Promise<number> {
    const linhasCompetencia = await this.prisma.linhaD8.findMany({
      where: { importacao: { competenciaAno, competenciaMes } },
      select: { cpf: true },
    });
    const cpfsNoD8 = new Set(
      linhasCompetencia.map((l: { cpf: string }) => l.cpf),
    );

    const candidatos = await this.prisma.afiliado.findMany({
      where: { status: { in: ['APROVADO', 'INATIVO'] } },
      select: { id: true, cpf: true, status: true },
    });

    const paraInativar = candidatos.filter(
      (a: { id: string; cpf: string; status: string }) =>
        !cpfsNoD8.has(a.cpf) && a.status !== 'INATIVO',
    );
    if (paraInativar.length === 0) return 0;

    await this.prisma.afiliado.updateMany({
      where: { id: { in: paraInativar.map((a: { id: string }) => a.id) } },
      data: { status: 'INATIVO' },
    });

    return paraInativar.length;
  }

  private async listarSemDesconto(competenciaAno: number, competenciaMes: number) {
    const linhas = await this.prisma.linhaD8.findMany({
      where: { importacao: { competenciaAno, competenciaMes } },
      select: { cpf: true },
    });
    const cpfsNoD8 = new Set(linhas.map((l: { cpf: string }) => l.cpf));

    const afiliados = await this.prisma.afiliado.findMany({
      where: { status: { in: ['APROVADO', 'INATIVO'] } },
      select: {
        id: true,
        nome: true,
        cpf: true,
        matricula: true,
        status: true,
        categoria: true,
      },
      orderBy: { nome: 'asc' },
    });

    return afiliados.filter((a: { cpf: string }) => !cpfsNoD8.has(a.cpf));
  }

  private async contarSemDesconto(
    competenciaAno: number,
    competenciaMes: number,
  ): Promise<number> {
    const lista = await this.listarSemDesconto(competenciaAno, competenciaMes);
    return lista.length;
  }
}
