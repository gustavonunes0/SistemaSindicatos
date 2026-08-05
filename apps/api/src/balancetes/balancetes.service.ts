import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  GrupoBalancete,
  ImportacaoBalancete,
  ImportacaoBalanceteDetalhe,
  ImportarBalanceteResultado,
  LinhaBalancete,
} from '@sindprf/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { parseTextoBalancete } from './balancete-parser';

const LOTE = 100;

function paraNumero(valor: unknown): number {
  return Number(valor);
}

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

@Injectable()
export class BalancetesService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.importacaoBalancete.findMany({
      orderBy: [{ competenciaAno: 'desc' }, { competenciaMes: 'desc' }],
    });
  }

  async detalhe(id: string): Promise<ImportacaoBalanceteDetalhe> {
    const importacao = await this.prisma.importacaoBalancete.findUnique({
      where: { id },
      include: {
        linhas: {
          where: {
            ehFolha: true,
            tipo: { in: ['RECEITA', 'DESPESA'] },
          },
          orderBy: [{ tipo: 'asc' }, { categoriaNome: 'asc' }, { codigoConta: 'asc' }],
        },
      },
    });

    if (!importacao) {
      throw new NotFoundException('Importação de balancete não encontrada');
    }

    const gruposMap = new Map<string, GrupoBalancete>();

    for (const linha of importacao.linhas) {
      const movimento = paraNumero(linha.movimento);
      if (movimento === 0) continue;
      if (linha.tipo !== 'RECEITA' && linha.tipo !== 'DESPESA') continue;

      const slug = linha.categoriaSlug ?? 'sem-categoria';
      const nome = linha.categoriaNome ?? 'Sem categoria';
      const chave = `${linha.tipo}:${slug}`;
      const serializada = this.serializarLinha(linha);

      const existente = gruposMap.get(chave);
      if (!existente) {
        gruposMap.set(chave, {
          tipo: linha.tipo,
          categoriaSlug: slug,
          categoriaNome: nome,
          total: serializada.movimento,
          linhas: [serializada],
        });
        continue;
      }

      existente.total = Math.round((existente.total + serializada.movimento) * 100) / 100;
      existente.linhas.push(serializada);
    }

    const grupos = [...gruposMap.values()].sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'RECEITA' ? -1 : 1;
      return Math.abs(b.total) - Math.abs(a.total);
    });

    return {
      ...this.serializarImportacao(importacao),
      grupos,
    };
  }

  async importarTexto(input: {
    texto: string;
    arquivoNome: string;
  }): Promise<ImportarBalanceteResultado> {
    let parseado;
    try {
      parseado = parseTextoBalancete(input.texto);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Falha ao interpretar o balancete';
      throw new BadRequestException(mensagem);
    }

    const { competenciaAno, competenciaMes } = parseado;

    const existente = await this.prisma.importacaoBalancete.findUnique({
      where: {
        tenantId_competenciaAno_competenciaMes: {
          tenantId: requireTenantId(),
          competenciaAno,
          competenciaMes,
        },
      },
    });

    if (existente) {
      await this.prisma.importacaoBalancete.delete({ where: { id: existente.id } });
    }

    const tenantId = requireTenantId();
    const importacao = await this.prisma.importacaoBalancete.create({
      data: {
        tenantId,
        competenciaAno,
        competenciaMes,
        arquivoNome: input.arquivoNome,
        totalLinhas: parseado.linhas.length,
        totalReceitas: new Prisma.Decimal(parseado.totalReceitas),
        totalDespesas: new Prisma.Decimal(parseado.totalDespesas),
        resultado: new Prisma.Decimal(parseado.resultado),
      },
    });

    const registros = parseado.linhas.map((linha, indice) => ({
      tenantId,
      importacaoId: importacao.id,
      sequencia: indice + 1,
      codigoConta: linha.codigoConta,
      descricao: linha.descricao,
      nivel: linha.nivel,
      tipo: linha.tipo,
      natureza: linha.natureza,
      saldoAnterior: new Prisma.Decimal(linha.saldoAnterior),
      debitos: new Prisma.Decimal(linha.debitos),
      creditos: new Prisma.Decimal(linha.creditos),
      saldoAtual: new Prisma.Decimal(linha.saldoAtual),
      movimento: new Prisma.Decimal(linha.movimento),
      categoriaSlug: linha.categoriaSlug,
      categoriaNome: linha.categoriaNome,
      ehFolha: linha.ehFolha,
    }));

    for (const lote of emLotes(registros, LOTE)) {
      await this.prisma.linhaBalancete.createMany({ data: lote });
    }

    return { importacao: this.serializarImportacao(importacao) };
  }

  private serializarImportacao(item: {
    id: string;
    competenciaAno: number;
    competenciaMes: number;
    arquivoNome: string;
    totalLinhas: number;
    totalReceitas: unknown;
    totalDespesas: unknown;
    resultado: unknown;
    createdAt: Date;
  }): ImportacaoBalancete {
    return {
      id: item.id,
      competenciaAno: item.competenciaAno,
      competenciaMes: item.competenciaMes,
      arquivoNome: item.arquivoNome,
      totalLinhas: item.totalLinhas,
      totalReceitas: paraNumero(item.totalReceitas),
      totalDespesas: paraNumero(item.totalDespesas),
      resultado: paraNumero(item.resultado),
      createdAt: item.createdAt,
    };
  }

  private serializarLinha(linha: {
    id: string;
    importacaoId: string;
    sequencia: number;
    codigoConta: string;
    descricao: string;
    nivel: number;
    tipo: LinhaBalancete['tipo'];
    natureza: LinhaBalancete['natureza'];
    saldoAnterior: unknown;
    debitos: unknown;
    creditos: unknown;
    saldoAtual: unknown;
    movimento: unknown;
    categoriaSlug: string | null;
    categoriaNome: string | null;
    ehFolha: boolean;
  }): LinhaBalancete {
    return {
      id: linha.id,
      importacaoId: linha.importacaoId,
      sequencia: linha.sequencia,
      codigoConta: linha.codigoConta,
      descricao: linha.descricao,
      nivel: linha.nivel,
      tipo: linha.tipo,
      natureza: linha.natureza,
      saldoAnterior: paraNumero(linha.saldoAnterior),
      debitos: paraNumero(linha.debitos),
      creditos: paraNumero(linha.creditos),
      saldoAtual: paraNumero(linha.saldoAtual),
      movimento: paraNumero(linha.movimento),
      categoriaSlug: linha.categoriaSlug,
      categoriaNome: linha.categoriaNome,
      ehFolha: linha.ehFolha,
    };
  }
}
