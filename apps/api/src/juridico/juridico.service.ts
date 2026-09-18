import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AcaoJuridica,
  ImportacaoAcaoJuridica,
  ImportarAcaoJuridicaResultado,
  ListarAcoesJuridicasQuery,
} from '@sindprf/types';
import type { RequestUser } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { parsePlanilhaAcoes } from './juridico-parser';

function serializarAcao(registro: {
  id: string;
  nome: string;
  cpf: string;
  numeroAcao: string;
  status: string;
  afiliadoId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AcaoJuridica {
  return {
    id: registro.id,
    nome: registro.nome,
    cpf: registro.cpf,
    numeroAcao: registro.numeroAcao,
    status: registro.status,
    afiliadoId: registro.afiliadoId,
    createdAt: registro.createdAt,
    updatedAt: registro.updatedAt,
  };
}

function serializarImportacao(registro: {
  id: string;
  arquivoNome: string;
  totalLinhas: number;
  novas: number;
  atualizadas: number;
  createdAt: Date;
}): ImportacaoAcaoJuridica {
  return {
    id: registro.id,
    arquivoNome: registro.arquivoNome,
    totalLinhas: registro.totalLinhas,
    novas: registro.novas,
    atualizadas: registro.atualizadas,
    createdAt: registro.createdAt,
  };
}

@Injectable()
export class JuridicoService {
  constructor(private readonly prisma: PrismaService) {}

  listarImportacoes() {
    return this.prisma.importacaoAcaoJuridica
      .findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      .then((itens: Array<Parameters<typeof serializarImportacao>[0]>) =>
        itens.map(serializarImportacao),
      );
  }

  async listarAcoesAdmin(query: ListarAcoesJuridicasQuery): Promise<AcaoJuridica[]> {
    const busca = query.busca?.trim();
    const registros = await this.prisma.acaoJuridica.findMany({
      where: busca
        ? {
            OR: [
              { nome: { contains: busca, mode: 'insensitive' } },
              { cpf: { contains: busca.replace(/\D/g, '') } },
              { numeroAcao: { contains: busca, mode: 'insensitive' } },
              { status: { contains: busca, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ updatedAt: 'desc' }, { numeroAcao: 'asc' }],
      take: 500,
    });

    return registros.map(serializarAcao);
  }

  async listarMinhas(user: RequestUser): Promise<AcaoJuridica[]> {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId: user.id },
      select: { cpf: true },
    });
    if (!afiliado) {
      return [];
    }

    const registros = await this.prisma.acaoJuridica.findMany({
      where: { cpf: afiliado.cpf },
      orderBy: [{ updatedAt: 'desc' }, { numeroAcao: 'asc' }],
    });

    return registros.map(serializarAcao);
  }

  async importarPlanilha(
    buffer: Buffer,
    arquivoNome: string,
  ): Promise<ImportarAcaoJuridicaResultado> {
    const tenantId = requireTenantId();

    let parseado;
    try {
      parseado = parsePlanilhaAcoes(buffer);
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Planilha inválida';
      throw new BadRequestException(mensagem);
    }

    const cpfs = [...new Set(parseado.linhas.map((linha) => linha.cpf))];
    const afiliados = await this.prisma.afiliado.findMany({
      where: { cpf: { in: cpfs } },
      select: { id: true, cpf: true },
    });
    const afiliadoPorCpf = new Map(afiliados.map((item) => [item.cpf, item.id]));

    const numeros = parseado.linhas.map((linha) => linha.numeroAcao);
    const existentes = await this.prisma.acaoJuridica.findMany({
      where: { numeroAcao: { in: numeros } },
      select: { numeroAcao: true },
    });
    const numerosExistentes = new Set(existentes.map((item: { numeroAcao: string }) => item.numeroAcao));

    let novas = 0;
    let atualizadas = 0;
    let vinculados = 0;
    let semCadastro = 0;

    const resultado = await this.prisma.$transaction(async (tx) => {
      const importacao = await tx.importacaoAcaoJuridica.create({
        data: {
          tenantId,
          arquivoNome,
          totalLinhas: parseado.linhas.length,
        },
      });

      for (const linha of parseado.linhas) {
        const afiliadoId = afiliadoPorCpf.get(linha.cpf) ?? null;
        if (afiliadoId) {
          vinculados += 1;
        } else {
          semCadastro += 1;
        }

        const jaExistia = numerosExistentes.has(linha.numeroAcao);
        if (jaExistia) {
          atualizadas += 1;
        } else {
          novas += 1;
          numerosExistentes.add(linha.numeroAcao);
        }

        await tx.acaoJuridica.upsert({
          where: {
            tenantId_numeroAcao: {
              tenantId,
              numeroAcao: linha.numeroAcao,
            },
          },
          create: {
            tenantId,
            importacaoId: importacao.id,
            sequencia: linha.sequencia,
            nome: linha.nome,
            cpf: linha.cpf,
            numeroAcao: linha.numeroAcao,
            status: linha.status,
            afiliadoId,
          },
          update: {
            importacaoId: importacao.id,
            sequencia: linha.sequencia,
            nome: linha.nome,
            cpf: linha.cpf,
            status: linha.status,
            afiliadoId,
          },
        });
      }

      return tx.importacaoAcaoJuridica.update({
        where: { id: importacao.id },
        data: { novas, atualizadas },
      });
    });

    return {
      importacao: serializarImportacao(resultado),
      resumo: {
        totalLinhas: parseado.linhas.length,
        novas,
        atualizadas,
        vinculados,
        semCadastro,
      },
    };
  }

  async detalheImportacao(id: string) {
    const importacao = await this.prisma.importacaoAcaoJuridica.findUnique({
      where: { id },
    });
    if (!importacao) {
      throw new NotFoundException('Importação não encontrada');
    }

    const acoes = await this.prisma.acaoJuridica.findMany({
      where: { importacaoId: id },
      orderBy: { sequencia: 'asc' },
    });

    return {
      importacao: serializarImportacao(importacao),
      acoes: acoes.map(serializarAcao),
    };
  }
}
