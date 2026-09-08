import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CadastrarContaFinanceira,
  ImportacaoFinanceiraDetalheQuery,
  ImportarFinanceiroInput,
  PaginacaoFinanceiraQuery,
  PreviewImportacaoFinanceira,
  PreviewImportacaoFinanceiraInput,
} from '@sindprf/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { parseDocumentoFinanceiro } from './financeiro-parser';

function numero(valor: unknown): number {
  return Number(valor);
}

function decimal(valor: number | null): Prisma.Decimal | null {
  return valor === null ? null : new Prisma.Decimal(valor.toFixed(2));
}

function sanitizarDocumento(valor: string | undefined): string | undefined {
  if (!valor) return undefined;
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length !== 11 && digitos.length !== 14) {
    throw new BadRequestException('CPF/CNPJ do titular inválido');
  }
  return digitos;
}

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  preview(input: PreviewImportacaoFinanceiraInput): PreviewImportacaoFinanceira {
    try {
      return parseDocumentoFinanceiro({
        conteudo: { texto: input.texto, paginas: input.paginas },
        arquivoNome: input.arquivoNome,
        instituicao: input.instituicao,
        tipoDocumento: input.tipoDocumento,
      });
    } catch (erro) {
      throw new BadRequestException(
        erro instanceof Error ? erro.message : 'Documento financeiro inválido',
      );
    }
  }

  listarContas() {
    return this.prisma.contaFinanceira.findMany({
      where: { ativo: true },
      orderBy: [{ instituicao: 'asc' }, { nome: 'asc' }],
    });
  }

  async cadastrarConta(input: CadastrarContaFinanceira) {
    const tenantId = requireTenantId();
    return this.prisma.contaFinanceira.upsert({
      where: {
        tenantId_instituicao_agencia_numero: {
          tenantId,
          instituicao: input.instituicao,
          agencia: input.agencia,
          numero: input.numero,
        },
      },
      create: {
        tenantId,
        ...input,
        titularDocumento: sanitizarDocumento(input.titularDocumento),
      },
      update: {
        nome: input.nome,
        titularNome: input.titularNome,
        titularDocumento: sanitizarDocumento(input.titularDocumento),
        ativo: true,
      },
    });
  }

  async importar(input: ImportarFinanceiroInput) {
    const preview = this.preview(input);
    if (input.sha256Esperado && input.sha256Esperado !== preview.sha256) {
      throw new ConflictException('O conteúdo mudou após o preview');
    }
    if (preview.validacaoSaldo.status === 'DIVERGENTE') {
      throw new BadRequestException('Importação bloqueada: saldo inicial e final não conciliam');
    }

    const tenantId = requireTenantId();
    const dadosConta: CadastrarContaFinanceira | null = input.conta ?? preview.contaDetectada;
    if (!input.contaId && !dadosConta) {
      throw new BadRequestException(
        'O documento não identifica a conta; selecione uma conta cadastrada',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        let conta;
        if (input.contaId) {
          conta = await tx.contaFinanceira.findFirst({
            where: { id: input.contaId, tenantId, ativo: true },
          });
        } else {
          if (!dadosConta) {
            throw new BadRequestException('Selecione uma conta financeira');
          }
          conta = await tx.contaFinanceira.upsert({
              where: {
                tenantId_instituicao_agencia_numero: {
                  tenantId,
                  instituicao: dadosConta.instituicao,
                  agencia: dadosConta.agencia,
                  numero: dadosConta.numero,
                },
              },
              create: {
                tenantId,
                ...dadosConta,
                titularDocumento: sanitizarDocumento(dadosConta.titularDocumento),
              },
              update: { ativo: true },
            });
        }
        if (!conta) throw new NotFoundException('Conta financeira não encontrada');
        if (conta.instituicao !== preview.instituicao) {
          throw new BadRequestException('A conta selecionada pertence a outra instituição');
        }

        const existente = await tx.importacaoFinanceira.findUnique({
          where: {
            tenantId_contaId_tipoDocumento_competenciaAno_competenciaMes: {
              tenantId,
              contaId: conta.id,
              tipoDocumento: preview.tipoDocumento,
              competenciaAno: preview.competenciaAno,
              competenciaMes: preview.competenciaMes,
            },
          },
          select: { id: true },
        });
        if (existente && !input.substituirExistente) {
          throw new ConflictException(
            'Já existe importação para esta conta, tipo e competência; confirme a substituição',
          );
        }
        if (existente) {
          await tx.importacaoFinanceira.delete({ where: { id: existente.id } });
        }

        const mesmoDocumento = await tx.importacaoFinanceira.findUnique({
          where: { tenantId_sha256: { tenantId, sha256: preview.sha256 } },
          select: { id: true },
        });
        if (mesmoDocumento) throw new ConflictException('Este documento já foi importado');

        const validacao = preview.validacaoSaldo;
        const importacao = await tx.importacaoFinanceira.create({
          data: {
            tenantId,
            contaId: conta.id,
            instituicao: preview.instituicao,
            tipoDocumento: preview.tipoDocumento,
            layout: preview.layout,
            arquivoNome: preview.arquivoNome,
            sha256: preview.sha256,
            competenciaAno: preview.competenciaAno,
            competenciaMes: preview.competenciaMes,
            periodoInicio: preview.periodoInicio,
            periodoFim: preview.periodoFim,
            vencimento: preview.vencimento,
            totalDocumento: decimal(preview.totalDocumento),
            saldoInicial: decimal(validacao.saldoInicial),
            saldoFinal: decimal(validacao.saldoFinal),
            totalCreditos: decimal(validacao.totalCreditos) as Prisma.Decimal,
            totalDebitos: decimal(validacao.totalDebitos) as Prisma.Decimal,
            statusValidacaoSaldo: validacao.status,
            totalLancamentos: preview.lancamentos.length,
          },
        });

        await tx.lancamentoFinanceiro.createMany({
          data: preview.lancamentos.map((item) => ({
            tenantId,
            importacaoId: importacao.id,
            contaId: conta.id,
            sequencia: item.sequencia,
            data: item.data,
            descricao: item.descricao,
            documento: item.documento,
            tipo: item.tipo,
            valor: new Prisma.Decimal(item.valor.toFixed(2)),
            saldoApos: decimal(item.saldoApos),
            contraparteNome: item.contraparteNome,
            // O parser já reduz CPF/CNPJ a uma máscara antes da persistência.
            contraparteDocumento: item.contraparteDocumento,
            portadorNome: item.portadorNome,
            cartaoFinal: item.cartaoFinal,
            parcelaNumero: item.parcelaNumero,
            parcelaTotal: item.parcelaTotal,
            fingerprint: item.fingerprint,
          })),
        });

        return this.serializarImportacao(importacao);
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Documento ou lançamentos já importados para esta conta');
      }
      throw erro;
    }
  }

  async listar(query: PaginacaoFinanceiraQuery) {
    const where: Prisma.ImportacaoFinanceiraWhereInput = {
      ...(query.contaId ? { contaId: query.contaId } : {}),
      ...(query.tipoDocumento ? { tipoDocumento: query.tipoDocumento } : {}),
    };
    const [itens, total] = await Promise.all([
      this.prisma.importacaoFinanceira.findMany({
        where,
        include: { conta: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.pagina - 1) * query.limite,
        take: query.limite,
      }),
      this.prisma.importacaoFinanceira.count({ where }),
    ]);
    return {
      itens: itens.map((item) => ({
        ...this.serializarImportacao(item),
        conta: item.conta,
      })),
      pagina: query.pagina,
      limite: query.limite,
      total,
    };
  }

  async detalhe(id: string, query: ImportacaoFinanceiraDetalheQuery) {
    const importacao = await this.prisma.importacaoFinanceira.findUnique({
      where: { id },
      include: { conta: true },
    });
    if (!importacao) throw new NotFoundException('Importação financeira não encontrada');

    const where: Prisma.LancamentoFinanceiroWhereInput = {
      importacaoId: id,
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.dataInicio || query.dataFim
        ? {
            data: {
              ...(query.dataInicio ? { gte: query.dataInicio } : {}),
              ...(query.dataFim ? { lte: query.dataFim } : {}),
            },
          }
        : {}),
      ...(query.busca
        ? {
            OR: [
              { descricao: { contains: query.busca, mode: 'insensitive' } },
              { documento: { contains: query.busca, mode: 'insensitive' } },
              { portadorNome: { contains: query.busca, mode: 'insensitive' } },
              { cartaoFinal: { contains: query.busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [lancamentos, totalLancamentos] = await Promise.all([
      this.prisma.lancamentoFinanceiro.findMany({
        where,
        orderBy: { sequencia: 'asc' },
        skip: (query.pagina - 1) * query.limite,
        take: query.limite,
      }),
      this.prisma.lancamentoFinanceiro.count({ where }),
    ]);
    return {
      ...this.serializarImportacao(importacao),
      conta: importacao.conta,
      lancamentos: lancamentos.map((item) => ({
        ...item,
        valor: numero(item.valor),
        saldoApos: item.saldoApos === null ? null : numero(item.saldoApos),
      })),
      pagina: query.pagina,
      limite: query.limite,
      totalLancamentos,
    };
  }

  private serializarImportacao(item: {
    id: string;
    contaId: string;
    instituicao: 'SICOOB' | 'SICREDI';
    tipoDocumento: 'EXTRATO' | 'FATURA';
    layout: string;
    arquivoNome: string;
    sha256: string;
    competenciaAno: number;
    competenciaMes: number;
    periodoInicio: Date;
    periodoFim: Date;
    vencimento: Date | null;
    totalDocumento: unknown;
    saldoInicial: unknown;
    saldoFinal: unknown;
    totalCreditos: unknown;
    totalDebitos: unknown;
    statusValidacaoSaldo: 'VALIDO' | 'DIVERGENTE' | 'NAO_APLICAVEL';
    totalLancamentos: number;
    createdAt: Date;
  }) {
    return {
      ...item,
      totalDocumento: item.totalDocumento === null ? null : numero(item.totalDocumento),
      saldoInicial: item.saldoInicial === null ? null : numero(item.saldoInicial),
      saldoFinal: item.saldoFinal === null ? null : numero(item.saldoFinal),
      totalCreditos: numero(item.totalCreditos),
      totalDebitos: numero(item.totalDebitos),
    };
  }
}
