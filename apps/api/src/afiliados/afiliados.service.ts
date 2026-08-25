import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CadastroAfiliadoAdminInput,
  CadastroAfiliadoInput,
  DirecaoOrdenacao,
  FiltroAfiliadosInput,
  OrdenacaoAfiliado,
  StatusAfiliado,
  TipoDocumentoFiliacao,
} from '@sindprf/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { requireTenantId } from '../tenant/tenant-context';

const BCRYPT_ROUNDS = 10;

type ListaCache = { expires: number; payload: unknown };
type TotalCache = { expires: number; total: number };
type DocumentoCadastro = {
  tipo: TipoDocumentoFiliacao;
  arquivo: Express.Multer.File;
};

/** O `id` no fim mantém a paginação estável quando há valores repetidos na coluna. */
function montarOrderBy(
  ordenar: OrdenacaoAfiliado,
  direcao: DirecaoOrdenacao,
): Prisma.AfiliadoOrderByWithRelationInput[] {
  const principal: Prisma.AfiliadoOrderByWithRelationInput =
    ordenar === 'matricula'
      ? { matricula: direcao }
      : ordenar === 'status'
        ? { status: direcao }
        : ordenar === 'createdAt'
          ? { createdAt: direcao }
          : { nome: direcao };
  return [principal, { id: 'asc' }];
}

/**
 * Ficha de filiação. O cadastro pela secretaria informa só os dados de acesso,
 * então cada campo ausente é gravado como nulo em vez de ficar indefinido.
 */
function camposDaFicha(input: CadastroAfiliadoInput | CadastroAfiliadoAdminInput) {
  return {
    dataNascimento: input.dataNascimento ?? null,
    rg: input.rg ?? null,
    orgaoExpedidor: input.orgaoExpedidor ?? null,
    naturalidade: input.naturalidade ?? null,
    estadoCivil: input.estadoCivil ?? null,
    nomeMae: input.nomeMae ?? null,
    nomePai: input.nomePai ?? null,
    conjuge: input.conjuge ?? null,
    endereco: input.endereco ?? null,
    complemento: input.complemento ?? null,
    bairro: input.bairro ?? null,
    cidade: input.cidade ?? null,
    uf: input.uf ?? null,
    cep: input.cep ?? null,
    lotacaoSiape: input.lotacaoSiape ?? null,
    lotacaoAtividade: input.lotacaoAtividade ?? null,
    instituidorPensao: input.instituidorPensao ?? null,
    dataAdmissao: input.dataAdmissao ?? null,
    celular: input.celular ?? null,
    celular2: input.celular2 ?? null,
    emailFuncional: input.emailFuncional ?? null,
    aceiteEstatutoEm: 'aceiteEstatuto' in input ? new Date() : null,
  };
}

@Injectable()
export class AfiliadosService {
  private readonly cacheLista = new Map<string, ListaCache>();
  private readonly cacheTotal = new Map<string, TotalCache>();
  private readonly cacheTtlMs = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private invalidarCacheLista(tenantId = requireTenantId()) {
    for (const chave of this.cacheLista.keys()) {
      if (chave.startsWith(`${tenantId}:`)) {
        this.cacheLista.delete(chave);
      }
    }
    for (const chave of this.cacheTotal.keys()) {
      if (chave.startsWith(`${tenantId}:`)) {
        this.cacheTotal.delete(chave);
      }
    }
  }

  async cadastrar(input: CadastroAfiliadoInput, documentos: DocumentoCadastro[] = []) {
    return this.criarAfiliado(input, 'PENDENTE', documentos);
  }

  async cadastrarAdmin(input: CadastroAfiliadoAdminInput) {
    return this.criarAfiliado(input, input.status);
  }

  private async criarAfiliado(
    input: CadastroAfiliadoInput | CadastroAfiliadoAdminInput,
    status: StatusAfiliado,
    documentos: DocumentoCadastro[] = [],
  ) {
    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);
    const tenantId = requireTenantId();
    const arquivosSalvos: {
      tipo: TipoDocumentoFiliacao;
      arquivoChave: string;
      nomeOriginal: string;
      mimeType: string;
      tamanhoBytes: number;
    }[] = [];

    try {
      for (const { tipo, arquivo } of documentos) {
        arquivosSalvos.push({
          tipo,
          arquivoChave: await this.storage.salvarPrivado(arquivo.buffer, arquivo.originalname),
          nomeOriginal: arquivo.originalname,
          mimeType: arquivo.mimetype,
          tamanhoBytes: arquivo.size,
        });
      }
      // Afiliado guarda a FK de User, então o create precisa ser encadeado.
      const criado = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { tenantId, email: input.email, senhaHash, role: 'AFILIADO' },
        });
        const afiliado = await tx.afiliado.create({
          data: {
            tenantId,
            userId: user.id,
            nome: input.nome,
            cpf: input.cpf,
            matricula: input.matricula,
            telefone: input.telefone ?? null,
            categoria: input.categoria ?? null,
            status,
            ...camposDaFicha(input),
          },
          include: { user: { select: { email: true } } },
        });
        if (input.dependentes.length > 0) {
          await tx.dependenteAfiliado.createMany({
            data: input.dependentes.map((dependente) => ({
              ...dependente,
              tenantId,
              afiliadoId: afiliado.id,
            })),
          });
        }
        if (arquivosSalvos.length > 0) {
          await tx.documentoAfiliado.createMany({
            data: arquivosSalvos.map((documento) => ({
              ...documento,
              tenantId,
              afiliadoId: afiliado.id,
            })),
          });
        }
        return afiliado;
      });
      this.invalidarCacheLista(tenantId);
      return criado;
    } catch (error) {
      await Promise.allSettled(
        arquivosSalvos.map((documento) => this.storage.removerPrivado(documento.arquivoChave)),
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email, CPF ou matrícula já cadastrado');
      }
      throw error;
    }
  }

  async listar(filtro: FiltroAfiliadosInput) {
    const tenantId = requireTenantId();
    const { status, busca, page, limit, ordenar, direcao } = filtro;
    const termo = busca?.trim() ?? '';
    const chave = `${tenantId}:${status ?? ''}:${termo}:${page}:${limit}:${ordenar}:${direcao}`;
    const cached = this.cacheLista.get(chave);
    if (cached && cached.expires > Date.now()) {
      return cached.payload;
    }

    const cpfDigitos = termo.replace(/\D/g, '');

    const where: Prisma.AfiliadoWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
      ...(termo
        ? {
            OR: [
              { nome: { contains: termo, mode: 'insensitive' } },
              ...(cpfDigitos.length > 0 ? [{ cpf: { contains: cpfDigitos } }] : []),
            ],
          }
        : {}),
    };

    // O total não muda entre páginas do mesmo filtro: cachear evita repetir o
    // count a cada troca de página, que é a consulta mais cara da listagem.
    const chaveTotal = `${tenantId}:${status ?? ''}:${termo}`;
    const totalCache = this.cacheTotal.get(chaveTotal);
    const totalConhecido =
      totalCache && totalCache.expires > Date.now() ? totalCache.total : undefined;

    const [total, registros] = await Promise.all([
      totalConhecido ?? this.prisma.afiliado.count({ where }),
      this.prisma.afiliado.findMany({
        where,
        select: {
          id: true,
          userId: true,
          nome: true,
          cpf: true,
          matricula: true,
          telefone: true,
          categoria: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { email: true } },
          _count: { select: { documentos: true } },
        },
        orderBy: montarOrderBy(ordenar, direcao),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const items = registros.map(({ _count, ...afiliado }) => ({
      ...afiliado,
      documentosCount: _count.documentos,
    }));

    if (totalConhecido === undefined) {
      this.cacheTotal.set(chaveTotal, { expires: Date.now() + this.cacheTtlMs, total });
    }

    const payload = {
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    this.cacheLista.set(chave, { expires: Date.now() + this.cacheTtlMs, payload });
    return payload;
  }

  /**
   * Ficha completa da solicitação. Dependentes e documentos vêm no mesmo
   * payload: a tela de análise precisa dos três de uma vez, e o banco fica em
   * outra região — separar em três rotas triplicaria a espera.
   */
  async buscarFicha(id: string) {
    const afiliado = await this.prisma.afiliado.findFirst({
      where: { id },
      include: {
        user: { select: { email: true } },
        dependentes: {
          select: { id: true, nome: true, parentesco: true, dataNascimento: true },
          orderBy: { createdAt: 'asc' },
        },
        documentos: {
          select: {
            id: true,
            tipo: true,
            nomeOriginal: true,
            mimeType: true,
            tamanhoBytes: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!afiliado) {
      throw new NotFoundException('Afiliado não encontrado');
    }

    const { user, ...dados } = afiliado;
    return { ...dados, email: user.email };
  }

  async baixarDocumento(afiliadoId: string, documentoId: string) {
    const documento = await this.prisma.documentoAfiliado.findFirst({
      where: { id: documentoId, afiliadoId },
      select: {
        arquivoChave: true,
        nomeOriginal: true,
        mimeType: true,
      },
    });
    if (!documento) {
      throw new NotFoundException('Documento não encontrado');
    }
    try {
      const buffer = await this.storage.lerPrivado(documento.arquivoChave);
      return { ...documento, buffer };
    } catch {
      throw new NotFoundException('Arquivo do documento não está disponível');
    }
  }

  async atualizarStatus(id: string, status: StatusAfiliado) {
    try {
      const atualizado = await this.prisma.afiliado.update({ where: { id }, data: { status } });
      this.invalidarCacheLista(atualizado.tenantId);
      return atualizado;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Afiliado não encontrado');
      }
      throw error;
    }
  }

  async atualizarSenha(id: string, novaSenha: string): Promise<void> {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!afiliado) {
      throw new NotFoundException('Afiliado não encontrado');
    }

    const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: afiliado.userId },
        data: { senhaHash },
      }),
      // Derruba sessões ativas após troca de senha pelo admin.
      this.prisma.refreshToken.updateMany({
        where: { userId: afiliado.userId, revogado: false },
        data: { revogado: true },
      }),
    ]);
  }
}
