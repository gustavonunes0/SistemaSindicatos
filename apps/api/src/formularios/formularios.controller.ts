import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  atualizarFormularioSchema,
  criarFormularioSchema,
  enviarRespostaSchema,
  type AtualizarFormularioInput,
  type CriarFormularioInput,
  type EnviarRespostaInput,
  type UploadArquivoFormularioResponse,
} from '@sindprf/types';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FormulariosService } from './formularios.service';
import { RespostasService } from './respostas.service';

const ARQUIVO_MAX_BYTES = 10 * 1024 * 1024;
const ARQUIVO_MIMETYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

@Controller('formularios')
export class FormulariosController {
  constructor(
    private readonly formulariosService: FormulariosService,
    private readonly respostasService: RespostasService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  // ----------------------------------------------------------------- admin

  @Roles('ADMIN')
  @Get('admin')
  @Header('Cache-Control', 'private, no-store')
  listarAdmin() {
    return this.formulariosService.listarAdmin();
  }

  @Roles('ADMIN')
  @Get('admin/:id')
  @Header('Cache-Control', 'private, no-store')
  buscarAdmin(@Param('id') id: string) {
    return this.formulariosService.buscarAdmin(id);
  }

  @Roles('ADMIN')
  @Get('admin/:id/respostas')
  @Header('Cache-Control', 'private, no-store')
  listarRespostas(@Param('id') id: string) {
    return this.respostasService.listar(id);
  }

  @Roles('ADMIN')
  @Get('admin/:id/respostas.csv')
  async exportarCsv(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { nome, conteudo } = await this.respostasService.exportarCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(conteudo);
  }

  @Roles('ADMIN')
  @Post()
  criar(@Body(new ZodValidationPipe(criarFormularioSchema)) body: CriarFormularioInput) {
    return this.formulariosService.criar(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarFormularioSchema)) body: AtualizarFormularioInput,
  ) {
    return this.formulariosService.atualizar(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.formulariosService.remover(id);
  }

  @Roles('ADMIN')
  @Delete('respostas/:id')
  removerResposta(@Param('id') id: string) {
    return this.respostasService.remover(id);
  }

  // --------------------------------------------------------------- filiado

  @Roles('AFILIADO')
  @Get('disponiveis')
  @Header('Cache-Control', 'private, no-store')
  listarDisponiveis(@CurrentUser() user: RequestUser) {
    return this.formulariosService.listarParaAfiliado(user);
  }

  // ---------------------------------------------------------------- público

  /**
   * Resposta varia conforme quem está logado (um filiado vê as perguntas, um
   * visitante talvez não), daí `private`: nenhum proxy pode reaproveitar.
   */
  @Public()
  @Get(':slug')
  @Header('Cache-Control', 'private, no-store')
  buscarPublico(@Param('slug') slug: string, @CurrentUser() user?: RequestUser) {
    return this.formulariosService.buscarPublico(slug, user);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ cadastro: { limit: 5, ttl: 60_000 } })
  @SkipThrottle({ auth: true })
  @Post(':slug/respostas')
  enviar(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(enviarRespostaSchema)) body: EnviarRespostaInput,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.respostasService.enviar(slug, user, body);
  }

  /**
   * Upload de anexo de resposta.
   *
   * Endpoint aberto é superfície de abuso, então três travas: o formulário
   * precisa existir e estar publicado, um formulário restrito exige filiado
   * aprovado, e o limite de taxa vale por IP.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ cadastro: { limit: 10, ttl: 60_000 } })
  @SkipThrottle({ auth: true })
  @Post(':slug/arquivo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: ARQUIVO_MAX_BYTES } }))
  async uploadArquivo(
    @Param('slug') slug: string,
    @UploadedFile() file?: Express.Multer.File,
    @CurrentUser() user?: RequestUser,
  ): Promise<UploadArquivoFormularioResponse> {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    if (!ARQUIVO_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido: envie PDF, JPEG, PNG ou WebP');
    }

    await this.garantirEnvioPermitido(slug, user);

    const url = await this.storageService.salvar(file.buffer, file.originalname);
    return { url, nome: file.originalname };
  }

  private async garantirEnvioPermitido(
    slug: string,
    user: RequestUser | undefined,
  ): Promise<void> {
    const [formulario, afiliado] = await Promise.all([
      this.prisma.formulario.findFirst({
        where: { slug, status: 'PUBLICADO' },
        select: { publico: true },
      }),
      user?.role === 'AFILIADO'
        ? this.prisma.afiliado.findUnique({
            where: { userId: user.id },
            select: { status: true },
          })
        : null,
    ]);

    if (!formulario) {
      throw new NotFoundException('Formulário não encontrado');
    }
    if (formulario.publico === 'FILIADOS' && afiliado?.status !== 'APROVADO') {
      throw new ForbiddenException('Este formulário é exclusivo para filiados aprovados');
    }
  }
}
