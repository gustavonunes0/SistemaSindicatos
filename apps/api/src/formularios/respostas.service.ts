import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { EnviarRespostaInput } from '@sindprf/types';
import type { RequestUser } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { lerCampos, lerItensResposta, montarItensResposta, resumirRespostas } from './campos';
import { montarCsv } from './csv';

@Injectable()
export class RespostasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma resposta.
   *
   * A regra de quem pode responder é conferida aqui, não no navegador. A trava
   * de "uma resposta por filiado" fica no índice único do banco: em vez de
   * consultar antes (que abriria janela para envio duplo em cliques rápidos),
   * deixamos o insert falhar e traduzimos o erro.
   */
  async enviar(slug: string, user: RequestUser | undefined, input: EnviarRespostaInput) {
    const [formulario, afiliado] = await Promise.all([
      this.prisma.formulario.findFirst({
        where: { slug },
        select: { id: true, campos: true, publico: true, status: true },
      }),
      user?.role === 'AFILIADO'
        ? this.prisma.afiliado.findUnique({
            where: { userId: user.id },
            select: { id: true, status: true },
          })
        : null,
    ]);

    if (!formulario || formulario.status === 'RASCUNHO') {
      throw new NotFoundException('Formulário não encontrado');
    }
    if (formulario.status === 'ENCERRADO') {
      throw new ForbiddenException('Este formulário está encerrado');
    }

    const aprovado = afiliado?.status === 'APROVADO';
    if (formulario.publico === 'FILIADOS' && !aprovado) {
      throw new ForbiddenException('Este formulário é exclusivo para filiados aprovados');
    }

    const campos = lerCampos(formulario.campos);
    if (campos.length === 0) {
      throw new ForbiddenException('Este formulário ainda não tem perguntas');
    }

    const valores = montarItensResposta(campos, input.valores);

    try {
      const resposta = await this.prisma.respostaFormulario.create({
        data: {
          tenantId: requireTenantId(),
          formularioId: formulario.id,
          afiliadoId: aprovado && afiliado ? afiliado.id : null,
          valores: valores as unknown as Prisma.InputJsonValue,
        },
        select: { id: true, enviadoEm: true },
      });
      return resposta;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Você já respondeu este formulário');
      }
      throw error;
    }
  }

  /** Formulário, respostas e contagem por opção em uma única ida ao banco. */
  async listar(formularioId: string) {
    const [formulario, respostas] = await Promise.all([
      this.prisma.formulario.findFirst({ where: { id: formularioId } }),
      this.prisma.respostaFormulario.findMany({
        where: { formularioId },
        select: {
          id: true,
          formularioId: true,
          afiliadoId: true,
          valores: true,
          enviadoEm: true,
          afiliado: { select: { nome: true, matricula: true } },
        },
        orderBy: { enviadoEm: 'desc' },
        take: 2000,
      }),
    ]);

    if (!formulario) {
      throw new NotFoundException('Formulário não encontrado');
    }

    const campos = lerCampos(formulario.campos);
    const linhas = respostas.map((resposta) => ({
      id: resposta.id,
      formularioId: resposta.formularioId,
      afiliadoId: resposta.afiliadoId,
      afiliadoNome: resposta.afiliado?.nome ?? null,
      afiliadoMatricula: resposta.afiliado?.matricula ?? null,
      valores: lerItensResposta(resposta.valores),
      enviadoEm: resposta.enviadoEm,
    }));

    return {
      formulario: { ...formulario, campos },
      respostas: linhas,
      resumo: resumirRespostas(
        campos,
        linhas.map((linha) => linha.valores),
      ),
    };
  }

  // A extension de tenant não intercepta delete singular, então o tenantId
  // entra no where à mão — sem ele, um id vazado atravessaria sindicatos.
  async remover(id: string) {
    const tenantId = requireTenantId();
    try {
      await this.prisma.respostaFormulario.delete({ where: { id, tenantId } });
      return { ok: true };
    } catch (error) {
      const ausente =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
      throw ausente ? new NotFoundException('Resposta não encontrada') : error;
    }
  }

  async exportarCsv(formularioId: string): Promise<{ nome: string; conteudo: string }> {
    const dados = await this.listar(formularioId);
    return {
      nome: `${dados.formulario.slug || 'formulario'}-respostas.csv`,
      conteudo: montarCsv(dados.formulario.campos, dados.respostas),
    };
  }
}
