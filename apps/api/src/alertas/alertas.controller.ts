import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  atualizarAlertaSchema,
  criarAlertaSchema,
  type AtualizarAlertaInput,
  type CriarAlertaInput,
  type UploadImagemAlertaResponse,
} from '@sindprf/types';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StorageService } from '../storage/storage.service';
import { AlertasService } from './alertas.service';

const IMAGEM_MAX_BYTES = 5 * 1024 * 1024;
const IMAGEM_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('alertas')
export class AlertasController {
  constructor(
    private readonly alertasService: AlertasService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Público, mas a resposta varia conforme quem está logado — daí `private`:
   * um proxy compartilhado não pode reaproveitar a resposta de um filiado
   * para um visitante anônimo.
   */
  @Public()
  @Get('ativos')
  @Header('Cache-Control', 'private, no-store')
  listarAtivos(@CurrentUser() user?: RequestUser) {
    return this.alertasService.listarVisiveis(user);
  }

  @Roles('ADMIN')
  @Get('admin')
  @Header('Cache-Control', 'private, no-store')
  listarAdmin() {
    return this.alertasService.listarAdmin();
  }

  @Roles('ADMIN')
  @Get('admin/:id')
  buscarAdmin(@Param('id') id: string) {
    return this.alertasService.buscarAdmin(id);
  }

  @Roles('ADMIN')
  @Post('imagem')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGEM_MAX_BYTES } }))
  async uploadImagem(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadImagemAlertaResponse> {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    if (!IMAGEM_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido: envie JPEG, PNG ou WebP');
    }
    const url = await this.storageService.salvar(file.buffer, file.originalname);
    return { url };
  }

  @Roles('ADMIN')
  @Post()
  criar(@Body(new ZodValidationPipe(criarAlertaSchema)) body: CriarAlertaInput) {
    return this.alertasService.criar(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarAlertaSchema)) body: AtualizarAlertaInput,
  ) {
    return this.alertasService.atualizar(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.alertasService.remover(id);
  }
}
