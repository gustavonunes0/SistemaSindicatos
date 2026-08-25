import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ListarDeclaracoesQuery } from '@sindprf/types';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { RequestUser } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { requireTenantId } from '../tenant/tenant-context';
import { TenantService } from '../tenant/tenant.service';
import { DeclaracaoPdfService } from './declaracao-pdf.service';
import {
  lerAssinaturaDoBranding,
  nomeArquivoDeclaracao,
  resolverBaseValidacao,
  serializarDeclaracao,
} from './declaracoes.util';

const RAIZ_UPLOADS = join(process.cwd(), 'uploads');

const INCLUDE_LISTAGEM = {
  convenio: { select: { nome: true } },
  afiliado: { select: { matricula: true } },
  assinadaPor: { select: { email: true } },
} as const;

@Injectable()
export class DeclaracoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly declaracaoPdf: DeclaracaoPdfService,
    private readonly tenantService: TenantService,
  ) {}

  /** Fila do admin: pendentes primeiro, que é o que exige ação. */
  async listarAdmin(query: ListarDeclaracoesQuery) {
    const busca = query.busca?.trim();
    const registros = await this.prisma.declaracaoEmitida.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(busca
          ? {
              OR: [
                { afiliadoNome: { contains: busca, mode: 'insensitive' } },
                { codigo: { contains: busca, mode: 'insensitive' } },
                { convenio: { nome: { contains: busca, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: INCLUDE_LISTAGEM,
      orderBy: [{ status: 'asc' }, { emitidaEm: 'desc' }],
      take: 300,
    });

    return registros.map(serializarDeclaracao);
  }

  /** Histórico do filiado logado. */
  async listarDoAfiliado(user: RequestUser) {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!afiliado) {
      return [];
    }

    const registros = await this.prisma.declaracaoEmitida.findMany({
      where: { afiliadoId: afiliado.id },
      include: INCLUDE_LISTAGEM,
      orderBy: { emitidaEm: 'desc' },
      take: 100,
    });

    return registros.map(serializarDeclaracao);
  }

  /**
   * Entrega o PDF de uma declaração.
   *
   * `versao` escolhe entre o original emitido e o devolvido assinado. O filiado
   * só alcança as próprias declarações; o vínculo é conferido aqui e não pela
   * URL, que é adivinhável.
   */
  async baixar(
    user: RequestUser,
    id: string,
    versao: 'original' | 'assinada',
  ): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const registro = await this.prisma.declaracaoEmitida.findFirst({
      where: { id },
      include: { convenio: { select: { nome: true } }, afiliado: { select: { userId: true } } },
    });

    if (!registro) {
      throw new NotFoundException('Declaração não encontrada');
    }

    const ehAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    if (!ehAdmin && registro.afiliado?.userId !== user.id) {
      throw new ForbiddenException('Esta declaração não é sua');
    }

    const caminhoRelativo =
      versao === 'assinada' ? registro.arquivoAssinadoUrl : registro.arquivoUrl;
    if (!caminhoRelativo) {
      throw new NotFoundException(
        versao === 'assinada'
          ? 'Esta declaração ainda não foi assinada'
          : 'O arquivo desta declaração não está disponível',
      );
    }

    const buffer = await this.lerArquivo(caminhoRelativo);
    const base = nomeArquivoDeclaracao(registro.convenio.nome, registro.codigo);
    return {
      buffer,
      nomeArquivo: versao === 'assinada' ? base.replace(/\.pdf$/, '-assinada.pdf') : base,
    };
  }

  /** Recebe o PDF assinado à mão e fecha a pendência. */
  async registrarAssinatura(user: RequestUser, id: string, arquivo: Buffer, nomeOriginal: string) {
    const tenantId = requireTenantId();
    const existe = await this.prisma.declaracaoEmitida.count({ where: { id } });
    if (existe === 0) {
      throw new NotFoundException('Declaração não encontrada');
    }

    const arquivoAssinadoUrl = await this.storage.salvar(arquivo, nomeOriginal);

    const registro = await this.prisma.declaracaoEmitida.update({
      where: { id, tenantId },
      data: {
        arquivoAssinadoUrl,
        status: 'ASSINADA',
        assinadaEm: new Date(),
        assinadaPorId: user.id,
      },
      include: INCLUDE_LISTAGEM,
    });

    return serializarDeclaracao(registro);
  }

  /** Desfaz a assinatura quando o arquivo subiu errado. */
  async removerAssinatura(id: string) {
    const tenantId = requireTenantId();
    try {
      const registro = await this.prisma.declaracaoEmitida.update({
        where: { id, tenantId },
        data: {
          arquivoAssinadoUrl: null,
          status: 'PENDENTE',
          assinadaEm: null,
          assinadaPorId: null,
        },
        include: INCLUDE_LISTAGEM,
      });
      return serializarDeclaracao(registro);
    } catch (error) {
      const ausente =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
      throw ausente ? new NotFoundException('Declaração não encontrada') : error;
    }
  }

  /** Guarda a rubrica no branding do sindicato, preservando o resto. */
  async definirAssinatura(url: string | null) {
    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { branding: true },
    });

    if (!tenant?.branding || typeof tenant.branding !== 'object') {
      throw new BadRequestException(
        'Este sindicato ainda não tem identidade visual configurada',
      );
    }

    const branding = { ...(tenant.branding as Prisma.JsonObject), assinaturaUrl: url };
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { branding } });

    // O tenant resolvido por host fica em cache por 60s. Sem limpar, o admin
    // recarrega a tela e continua vendo a rubrica antiga.
    this.tenantService.invalidarCache();
  }

  /**
   * Aplica a rubrica cadastrada e fecha a pendência sem passar pelo papel.
   *
   * O PDF é gerado de novo a partir do registro, e não carimbado sobre o
   * arquivo original, porque todo o conteúdo do documento está no banco — assim
   * a rubrica entra no layout, e não colada por cima dele. A data impressa
   * continua sendo a da emissão.
   */
  async assinarComRubrica(user: RequestUser, id: string) {
    const tenantId = requireTenantId();

    const [registro, tenant, dominios] = await Promise.all([
      this.prisma.declaracaoEmitida.findFirst({
        where: { id },
        include: { convenio: { select: { nome: true } } },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { branding: true },
      }),
      this.prisma.tenantDomain.findMany({
        where: { tenantId },
        orderBy: [{ primario: 'desc' }, { createdAt: 'asc' }],
        select: { host: true },
      }),
    ]);

    if (!registro) {
      throw new NotFoundException('Declaração não encontrada');
    }

    const assinaturaUrl = lerAssinaturaDoBranding(tenant?.branding);
    if (!assinaturaUrl) {
      throw new BadRequestException(
        'Cadastre a assinatura da presidente antes de assinar pela plataforma',
      );
    }

    const urlValidacao = `${resolverBaseValidacao(dominios)}/validar-declaracao/${registro.codigo}`;

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
      codigoValidacao: registro.codigo,
      assinaturaUrl,
      emitidaEm: registro.emitidaEm,
    });

    const nomeArquivo = nomeArquivoDeclaracao(registro.convenio.nome, registro.codigo).replace(
      /\.pdf$/,
      '-assinada.pdf',
    );
    const arquivoAssinadoUrl = await this.storage.salvar(buffer, nomeArquivo);

    const atualizado = await this.prisma.declaracaoEmitida.update({
      where: { id, tenantId },
      data: {
        arquivoAssinadoUrl,
        status: 'ASSINADA',
        assinadaEm: new Date(),
        assinadaPorId: user.id,
      },
      include: INCLUDE_LISTAGEM,
    });

    return serializarDeclaracao(atualizado);
  }

  /** O `resolve` + prefixo barram `..` vindo de um registro adulterado. */
  private async lerArquivo(caminhoRelativo: string): Promise<Buffer> {
    if (!caminhoRelativo.startsWith('/uploads/')) {
      throw new NotFoundException('Arquivo indisponível');
    }
    const destino = resolve(RAIZ_UPLOADS, caminhoRelativo.slice('/uploads/'.length));
    if (!destino.startsWith(RAIZ_UPLOADS)) {
      throw new NotFoundException('Arquivo indisponível');
    }
    try {
      return await readFile(destino);
    } catch {
      throw new NotFoundException('Arquivo indisponível');
    }
  }
}
