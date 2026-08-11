import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarConvenioInput,
  CriarConvenioInput,
  DeclaracaoValidacaoResposta,
  EmitirDeclaracaoInput,
  FiltroConveniosInput,
} from '@sindprf/types';
import { MODELO_DECLARACAO_ROTULO } from '@sindprf/types';
import { randomBytes } from 'node:crypto';
import type { RequestUser } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { DeclaracaoPdfService } from './declaracao-pdf.service';

@Injectable()
export class ConveniosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly declaracaoPdf: DeclaracaoPdfService,
  ) {}

  criar(input: CriarConvenioInput) {
    return this.prisma.convenio.create({
      data: { ...this.montarDados(input), tenantId: requireTenantId() },
    });
  }

  async atualizar(id: string, input: AtualizarConvenioInput) {
    try {
      return await this.prisma.convenio.update({
        where: { id },
        data: this.montarDados(input),
      });
    } catch (error) {
      throw this.tratarNaoEncontrado(error);
    }
  }

  async remover(id: string): Promise<void> {
    try {
      await this.prisma.convenio.delete({ where: { id } });
    } catch (error) {
      throw this.tratarNaoEncontrado(error);
    }
  }

  listarAdmin() {
    return this.prisma.convenio.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async buscarAdmin(id: string) {
    const convenio = await this.prisma.convenio.findUnique({ where: { id } });
    if (!convenio) {
      throw new NotFoundException('Convênio não encontrado');
    }
    return convenio;
  }

  listarPublico({ categoria, busca }: FiltroConveniosInput) {
    const where: Prisma.ConvenioWhereInput = { ativo: true };
    if (categoria) {
      where.categoria = categoria;
    }
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
      ];
    }
    return this.prisma.convenio.findMany({ where, orderBy: { nome: 'asc' } });
  }

  async buscarPublico(id: string) {
    const convenio = await this.prisma.convenio.findUnique({ where: { id } });
    if (!convenio || !convenio.ativo) {
      throw new NotFoundException('Convênio não encontrado');
    }
    return convenio;
  }

  async listarCategorias(): Promise<string[]> {
    const registros = await this.prisma.convenio.findMany({
      where: { ativo: true },
      distinct: ['categoria'],
      select: { categoria: true },
      orderBy: { categoria: 'asc' },
    });
    return registros.map((registro) => registro.categoria);
  }

  async emitirDeclaracao(
    user: RequestUser,
    convenioId: string,
    input: EmitirDeclaracaoInput,
  ): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const tenantId = requireTenantId();

    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId: user.id },
      select: { id: true, nome: true, cpf: true, status: true },
    });
    if (!afiliado || afiliado.status !== 'APROVADO') {
      throw new ForbiddenException('Afiliação ainda não aprovada');
    }

    const convenio = await this.buscarPublico(convenioId);
    if (!convenio.emiteDeclaracao || !convenio.modeloDeclaracao || !convenio.destinoDeclaracao) {
      throw new BadRequestException('Este convênio não emite declaração');
    }

    if (convenio.modeloDeclaracao === 'DEPENDENTE') {
      if (!input.dependenteNome?.trim() || !input.dependenteCpf) {
        throw new BadRequestException('Informe o nome e o CPF do dependente');
      }
    }

    if (convenio.modeloDeclaracao === 'AUTORIZACAO_HOSPEDAGEM') {
      if (!input.periodoInicio || !input.periodoFim) {
        throw new BadRequestException('Informe o período de hospedagem');
      }
    }

    const codigo = await this.gerarCodigoUnico(tenantId);
    const urlValidacao = await this.montarUrlValidacao(tenantId, codigo);

    const registro = await this.prisma.declaracaoEmitida.create({
      data: {
        tenantId,
        codigo,
        convenioId: convenio.id,
        afiliadoId: afiliado.id,
        modelo: convenio.modeloDeclaracao,
        destino: convenio.destinoDeclaracao,
        textoComplementar: convenio.textoComplementar,
        afiliadoNome: afiliado.nome,
        afiliadoCpf: afiliado.cpf,
        dependenteNome: input.dependenteNome?.trim() || null,
        dependenteCpf: input.dependenteCpf ?? null,
        periodoInicio: input.periodoInicio ?? null,
        periodoFim: input.periodoFim ?? null,
      },
    });

    const buffer = await this.declaracaoPdf.gerar({
      modelo: registro.modelo,
      destino: registro.destino,
      textoComplementar: registro.textoComplementar,
      afiliadoNome: registro.afiliadoNome,
      afiliadoCpf: registro.afiliadoCpf,
      dependenteNome: registro.dependenteNome ?? undefined,
      dependenteCpf: registro.dependenteCpf ?? undefined,
      periodoInicio: registro.periodoInicio ?? undefined,
      periodoFim: registro.periodoFim ?? undefined,
      urlValidacao,
      codigoValidacao: codigo,
    });

    const slug = convenio.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 40);
    const nomeArquivo = `declaracao-${slug || 'convenio'}-${codigo}.pdf`;

    return { buffer, nomeArquivo };
  }

  async validarDeclaracao(codigoBruto: string): Promise<DeclaracaoValidacaoResposta> {
    const codigo = codigoBruto.trim().toUpperCase();
    if (!codigo || codigo.length < 6) {
      return { valida: false, motivo: 'Código de validação inválido.' };
    }

    const registro = await this.prisma.declaracaoEmitida.findFirst({
      where: { codigo },
      include: {
        convenio: { select: { nome: true } },
        afiliado: { select: { status: true } },
        tenant: { select: { nome: true } },
      },
    });

    if (!registro) {
      return { valida: false, motivo: 'Declaração não encontrada para este código.' };
    }

    const afiliadoAtivo = registro.afiliado.status === 'APROVADO';

    return {
      valida: true,
      codigo: registro.codigo,
      modelo: registro.modelo,
      modeloRotulo: MODELO_DECLARACAO_ROTULO[registro.modelo as keyof typeof MODELO_DECLARACAO_ROTULO],
      convenioNome: registro.convenio.nome,
      destino: registro.destino,
      afiliadoNome: registro.afiliadoNome,
      afiliadoCpfMascarado: mascararCpf(registro.afiliadoCpf),
      afiliadoStatus: registro.afiliado.status as 'PENDENTE' | 'APROVADO' | 'INATIVO',
      afiliadoAtivo,
      dependenteNome: registro.dependenteNome,
      dependenteCpfMascarado: registro.dependenteCpf
        ? mascararCpf(registro.dependenteCpf)
        : null,
      periodoInicio: registro.periodoInicio,
      periodoFim: registro.periodoFim,
      emitidaEm: registro.emitidaEm,
      sindicatoNome: registro.tenant.nome,
    };
  }

  private async gerarCodigoUnico(tenantId: string): Promise<string> {
    for (let tentativa = 0; tentativa < 8; tentativa += 1) {
      const codigo = randomBytes(5).toString('hex').toUpperCase().slice(0, 10);
      const existe = await this.prisma.declaracaoEmitida.findFirst({
        where: { tenantId, codigo },
        select: { id: true },
      });
      if (!existe) return codigo;
    }
    throw new BadRequestException('Não foi possível gerar código de validação');
  }

  private async montarUrlValidacao(tenantId: string, codigo: string): Promise<string> {
    const dominios = await this.prisma.tenantDomain.findMany({
      where: { tenantId },
      orderBy: [{ primario: 'desc' }, { createdAt: 'asc' }],
      select: { host: true },
    });

    const ehLocal = (host: string) =>
      host === 'localhost' || host.startsWith('127.') || host.endsWith('.local');

    const publico = dominios.find((d) => !ehLocal(d.host.toLowerCase()));
    const escolhido = publico ?? dominios[0];

    let base: string | null = null;
    if (escolhido?.host) {
      const host = escolhido.host.toLowerCase();
      base = `${ehLocal(host) ? 'http' : 'https'}://${host}`;
    } else if (process.env.WEB_URL?.trim()) {
      base = process.env.WEB_URL.trim().replace(/\/+$/, '');
    }

    if (!base) {
      throw new BadRequestException(
        'Não há domínio do sindicato cadastrado para gerar o QR Code de validação',
      );
    }

    return `${base}/validar-declaracao/${codigo}`;
  }

  private montarDados(input: AtualizarConvenioInput): Prisma.ConvenioUncheckedCreateInput {
    const dados: Prisma.ConvenioUncheckedCreateInput = {} as Prisma.ConvenioUncheckedCreateInput;
    if (input.nome !== undefined) dados.nome = input.nome;
    if (input.categoria !== undefined) dados.categoria = input.categoria;
    if (input.descricao !== undefined) dados.descricao = input.descricao;
    if (input.logoUrl !== undefined) dados.logoUrl = input.logoUrl;
    if (input.link !== undefined) dados.link = input.link;
    if (input.contato !== undefined) dados.contato = input.contato;
    if (input.vigenciaInicio !== undefined) dados.vigenciaInicio = input.vigenciaInicio;
    if (input.vigenciaFim !== undefined) dados.vigenciaFim = input.vigenciaFim;
    if (input.ativo !== undefined) dados.ativo = input.ativo;
    if (input.emiteDeclaracao !== undefined) dados.emiteDeclaracao = input.emiteDeclaracao;
    if (input.modeloDeclaracao !== undefined) dados.modeloDeclaracao = input.modeloDeclaracao;
    if (input.destinoDeclaracao !== undefined) dados.destinoDeclaracao = input.destinoDeclaracao;
    if (input.textoComplementar !== undefined) dados.textoComplementar = input.textoComplementar;
    return dados;
  }

  private tratarNaoEncontrado(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return new NotFoundException('Convênio não encontrado');
    }
    return error;
  }
}

function mascararCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '').padStart(11, '0').slice(-11);
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
