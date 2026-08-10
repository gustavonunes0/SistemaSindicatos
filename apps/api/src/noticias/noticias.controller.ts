import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  atualizarNoticiaSchema,
  criarNoticiaSchema,
  listarNoticiasQuerySchema,
  type AtualizarNoticiaInput,
  type CriarNoticiaInput,
  type ListarNoticiasQuery,
  type UploadAnexoResponse,
  type UploadCapaResponse,
} from '@sindprf/types';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StorageService } from '../storage/storage.service';
import { NoticiasService } from './noticias.service';

const CAPA_MAX_BYTES = 5 * 1024 * 1024;
const CAPA_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ANEXO_MAX_BYTES = 15 * 1024 * 1024;
const ANEXO_MIMETYPES = ['application/pdf'];

function nomeArquivoSeguro(nomeOriginal: string): string {
  const base = nomeOriginal.split(/[/\\]/).pop()?.trim() || 'anexo.pdf';
  return base.slice(0, 180);
}

@Controller('noticias')
export class NoticiasController {
  constructor(
    private readonly noticiasService: NoticiasService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @Get()
  listarPublicadas(
    @Query(new ZodValidationPipe(listarNoticiasQuerySchema)) query: ListarNoticiasQuery,
  ) {
    return this.noticiasService.listarPublicadas(query);
  }

  @Roles('ADMIN')
  @Get('admin')
  listarAdmin() {
    return this.noticiasService.listarAdmin();
  }

  @Roles('ADMIN')
  @Get('admin/:id')
  buscarAdmin(@Param('id') id: string) {
    return this.noticiasService.buscarAdmin(id);
  }

  @Public()
  @Get(':slug')
  buscarPorSlug(@Param('slug') slug: string) {
    return this.noticiasService.buscarPublicadaPorSlug(slug);
  }

  @Roles('ADMIN')
  @Post()
  criar(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(criarNoticiaSchema)) body: CriarNoticiaInput,
  ) {
    return this.noticiasService.criar(user.id, body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarNoticiaSchema)) body: AtualizarNoticiaInput,
  ) {
    return this.noticiasService.atualizar(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.noticiasService.remover(id);
  }

  @Roles('ADMIN')
  @Post('capa')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CAPA_MAX_BYTES } }))
  async uploadCapa(@UploadedFile() file?: Express.Multer.File): Promise<UploadCapaResponse> {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    if (!CAPA_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido: envie JPEG, PNG ou WebP');
    }
    const url = await this.storageService.salvar(file.buffer, file.originalname);
    return { url };
  }

  @Roles('ADMIN')
  @Post('anexo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: ANEXO_MAX_BYTES } }))
  async uploadAnexo(@UploadedFile() file?: Express.Multer.File): Promise<UploadAnexoResponse> {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    if (!ANEXO_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido: envie um PDF');
    }
    const nome = nomeArquivoSeguro(file.originalname);
    const url = await this.storageService.salvar(file.buffer, nome.endsWith('.pdf') ? nome : `${nome}.pdf`);
    return { url, nome };
  }
}
