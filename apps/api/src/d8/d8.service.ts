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
import { requireTenantId } from '../tenant/tenant-context';
import { parseTextoD8, type D8Parseado, type LinhaD8Parseada } from './d8-parser';

/**
 * Cost 8: ~4× mais rápido que 10. Adequado para senha inicial = matrícula
 * em importação em massa (senão o gateway corta em 60s).
 */
const BCRYPT_ROUNDS_D8 = 8;
/** Paralelismo do bcrypt (docker sobe UV_THREADPOOL_SIZE=16). */
const BCRYPT_CONCORRENCIA = 8;
/** `createMany` cabe num único INSERT; lotes maiores = menos viagens ao banco. */
const LOTE_INSERT = 1500;
/** Updates em lote via SQL — evita milhares de round-trips ao Postgres remoto. */
const LOTE_UPDATE_SQL = 800;

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

async function mapComLimite<T, R>(
  itens: T[],
  limite: number,
  fn: (item: T, indice: number) => Promise<R>,
): Promise<R[]> {
  if (itens.length === 0) return [];
  const resultados = new Array<R>(itens.length);
  let proximo = 0;

  async function trabalhador(): Promise<void> {
    while (true) {
      const indice = proximo;
      proximo += 1;
      if (indice >= itens.length) return;
      resultados[indice] = await fn(itens[indice]!, indice);
    }
  }

  const workers = Math.min(limite, itens.length);
  await Promise.all(Array.from({ length: workers }, () => trabalhador()));
  return resultados;
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

  async excluir(id: string): Promise<void> {
    const { count } = await this.prisma.importacaoD8.deleteMany({ where: { id } });
    if (count === 0) {
      throw new NotFoundException('Importação D8 não encontrada');
    }
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
    const tenantId = requireTenantId();

    if (substituirBase) {
      await this.apagarAfiliados();
    }

    const existente = await this.prisma.importacaoD8.findUnique({
      where: {
        tenantId_competenciaAno_competenciaMes_tipo: {
          tenantId,
          competenciaAno: parseado.competenciaAno,
          competenciaMes: parseado.competenciaMes,
          tipo,
        },
      },
    });

    if (existente) {
      // LinhaD8.importacao é onDelete: Cascade — as linhas somem junto.
      await this.prisma.importacaoD8.delete({ where: { id: existente.id } });
    }

    const importacao = await this.prisma.importacaoD8.create({
      data: {
        tenantId,
        competenciaAno: parseado.competenciaAno,
        competenciaMes: parseado.competenciaMes,
        tipo,
        arquivoNome,
        totalLinhas: parseado.linhas.length,
        totalValor: parseado.totalValor.toFixed(2),
      },
    });

    const { criados, vinculados, afiliadoPorCpf } = await this.sincronizarAfiliados(
      parseado.linhas,
      tipo,
      tenantId,
    );

    for (const lote of emLotes(parseado.linhas, LOTE_INSERT)) {
      await this.prisma.linhaD8.createMany({
        data: lote.map((linha) => ({
          tenantId,
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

    const [inativados, semDesconto] = await Promise.all([
      this.inativarAusentes(parseado.competenciaAno, parseado.competenciaMes, tenantId),
      this.contarSemDesconto(parseado.competenciaAno, parseado.competenciaMes, tenantId),
    ]);

    const semCadastro = parseado.linhas.length - vinculados;

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
    tenantId: string,
  ): Promise<{
    criados: number;
    vinculados: number;
    afiliadoPorCpf: Map<string, string>;
  }> {
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

    const paraAtualizar: Array<{ linha: LinhaD8Parseada; afiliado: AfiliadoMatch }> = [];
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
        paraAtualizar.push({ linha, afiliado });
        const atualizado: AfiliadoMatch = {
          ...afiliado,
          cpf: linha.cpf,
          matricula: linha.matricula,
          nome: linha.nome,
        };
        porCpf.set(linha.cpf, atualizado);
        porMatricula.set(linha.matricula, atualizado);
      } else {
        paraCriar.push(linha);
      }
    }

    await this.atualizarAfiliadosEmLote(paraAtualizar, tipo, tenantId);
    await this.criarAfiliadosEmLote(paraCriar, tipo, tenantId, porCpf);

    const afiliadoPorCpf = new Map<string, string>();
    for (const [cpf, afiliado] of porCpf) {
      afiliadoPorCpf.set(cpf, afiliado.id);
    }

    // Garante CPFs recém-criados (createMany + skipDuplicates).
    if (paraCriar.length > 0) {
      const criados = await this.prisma.afiliado.findMany({
        where: { cpf: { in: paraCriar.map((l) => l.cpf) } },
        select: { id: true, cpf: true },
      });
      for (const afiliado of criados) {
        afiliadoPorCpf.set(afiliado.cpf, afiliado.id);
      }
    }

    return {
      criados: paraCriar.length,
      vinculados: paraAtualizar.length + paraCriar.length,
      afiliadoPorCpf,
    };
  }

  private async atualizarAfiliadosEmLote(
    alvos: Array<{ linha: LinhaD8Parseada; afiliado: AfiliadoMatch }>,
    tipo: TipoD8,
    tenantId: string,
  ): Promise<void> {
    if (alvos.length === 0) return;

    for (const lote of emLotes(alvos, LOTE_UPDATE_SQL)) {
      const ids = lote.map(({ afiliado }) => afiliado.id);
      const nomes = lote.map(({ linha }) => linha.nome);
      const matriculas = lote.map(({ linha }) => linha.matricula);
      const cpfs = lote.map(({ linha }) => linha.cpf);
      const categorias = lote.map(() => tipo);

      await this.prisma.$executeRaw`
        UPDATE "afiliados" AS a
        SET
          nome = d.nome,
          matricula = d.matricula,
          cpf = d.cpf,
          categoria = d.categoria::"TipoD8",
          status = 'APROVADO'::"StatusAfiliado",
          "updatedAt" = NOW()
        FROM unnest(
          ${ids}::text[],
          ${nomes}::text[],
          ${matriculas}::text[],
          ${cpfs}::text[],
          ${categorias}::text[]
        ) AS d(id, nome, matricula, cpf, categoria)
        WHERE a.id = d.id
          AND a."tenantId" = ${tenantId}
      `;
    }

    const trocasSenha = alvos.filter(
      ({ linha, afiliado }) => afiliado.matricula !== linha.matricula,
    );
    if (trocasSenha.length === 0) return;

    const matriculasUnicas = [...new Set(trocasSenha.map(({ linha }) => linha.matricula))];
    const hashPorMatricula = await this.hashearMatriculas(matriculasUnicas);

    for (const lote of emLotes(trocasSenha, LOTE_UPDATE_SQL)) {
      const userIds = lote.map(({ afiliado }) => afiliado.userId);
      const hashes = lote.map(({ linha }) => hashPorMatricula.get(linha.matricula)!);

      await this.prisma.$executeRaw`
        UPDATE "users" AS u
        SET
          "senhaHash" = d.hash,
          "updatedAt" = NOW()
        FROM unnest(
          ${userIds}::text[],
          ${hashes}::text[]
        ) AS d(id, hash)
        WHERE u.id = d.id
          AND u."tenantId" = ${tenantId}
      `;
    }
  }

  private async criarAfiliadosEmLote(
    paraCriar: LinhaD8Parseada[],
    tipo: TipoD8,
    tenantId: string,
    porCpf: Map<string, AfiliadoMatch>,
  ): Promise<void> {
    if (paraCriar.length === 0) return;

    const matriculasUnicas = [...new Set(paraCriar.map((l) => l.matricula))];
    const hashPorMatricula = await this.hashearMatriculas(matriculasUnicas);

    for (const lote of emLotes(paraCriar, LOTE_INSERT)) {
      await this.prisma.user.createMany({
        data: lote.map((linha) => ({
          tenantId,
          email: `d8.${linha.cpf}@sindprf.local`,
          senhaHash: hashPorMatricula.get(linha.matricula)!,
          role: 'AFILIADO' as const,
        })),
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
            tenantId,
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

      const criados = await this.prisma.afiliado.findMany({
        where: { cpf: { in: lote.map((l) => l.cpf) } },
        select: { id: true, userId: true, cpf: true, matricula: true, nome: true },
      });
      for (const afiliado of criados) {
        porCpf.set(afiliado.cpf, afiliado);
      }
    }
  }

  private async hashearMatriculas(matriculas: string[]): Promise<Map<string, string>> {
    const hashes = await mapComLimite(matriculas, BCRYPT_CONCORRENCIA, (matricula) =>
      bcrypt.hash(matricula, BCRYPT_ROUNDS_D8),
    );
    return new Map(matriculas.map((matricula, i) => [matricula, hashes[i]!]));
  }

  private async inativarAusentes(
    competenciaAno: number,
    competenciaMes: number,
    tenantId: string,
  ): Promise<number> {
    const afetados = await this.prisma.$executeRaw`
      UPDATE "afiliados" AS a
      SET
        status = 'INATIVO'::"StatusAfiliado",
        "updatedAt" = NOW()
      WHERE a."tenantId" = ${tenantId}
        AND a.status = 'APROVADO'::"StatusAfiliado"
        AND NOT EXISTS (
          SELECT 1
          FROM "linhas_d8" AS l
          INNER JOIN "importacoes_d8" AS i ON i.id = l."importacaoId"
          WHERE l."tenantId" = ${tenantId}
            AND i."competenciaAno" = ${competenciaAno}
            AND i."competenciaMes" = ${competenciaMes}
            AND l.cpf = a.cpf
        )
    `;
    return Number(afetados);
  }

  private async listarSemDesconto(competenciaAno: number, competenciaMes: number) {
    const tenantId = requireTenantId();
    return this.prisma.$queryRaw<
      Array<{
        id: string;
        nome: string;
        cpf: string;
        matricula: string;
        status: 'APROVADO' | 'INATIVO' | 'PENDENTE';
        categoria: TipoD8 | null;
      }>
    >`
      SELECT
        a.id,
        a.nome,
        a.cpf,
        a.matricula,
        a.status,
        a.categoria
      FROM "afiliados" AS a
      WHERE a."tenantId" = ${tenantId}
        AND a.status IN ('APROVADO'::"StatusAfiliado", 'INATIVO'::"StatusAfiliado")
        AND NOT EXISTS (
          SELECT 1
          FROM "linhas_d8" AS l
          INNER JOIN "importacoes_d8" AS i ON i.id = l."importacaoId"
          WHERE l."tenantId" = ${tenantId}
            AND i."competenciaAno" = ${competenciaAno}
            AND i."competenciaMes" = ${competenciaMes}
            AND l.cpf = a.cpf
        )
      ORDER BY a.nome ASC
    `;
  }

  private async contarSemDesconto(
    competenciaAno: number,
    competenciaMes: number,
    tenantId: string,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "afiliados" AS a
      WHERE a."tenantId" = ${tenantId}
        AND a.status IN ('APROVADO'::"StatusAfiliado", 'INATIVO'::"StatusAfiliado")
        AND NOT EXISTS (
          SELECT 1
          FROM "linhas_d8" AS l
          INNER JOIN "importacoes_d8" AS i ON i.id = l."importacaoId"
          WHERE l."tenantId" = ${tenantId}
            AND i."competenciaAno" = ${competenciaAno}
            AND i."competenciaMes" = ${competenciaMes}
            AND l.cpf = a.cpf
        )
    `;
    return Number(rows[0]?.count ?? 0);
  }
}
