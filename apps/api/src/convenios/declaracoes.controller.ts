import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  listarDeclaracoesQuerySchema,
  type ListarDeclaracoesQuery,
  type UploadAssinaturaResponse,
} from '@sindprf/types';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StorageService } from '../storage/storage.service';
import { DeclaracoesService } from './declaracoes.service';

/** Digitalização de um documento assinado costuma passar de 5 MB. */
const PDF_MAX_BYTES = 15 * 1024 * 1024;
const RUBRICA_MAX_BYTES = 2 * 1024 * 1024;
const RUBRICA_MIMETYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Controller('declaracoes')
export class DeclaracoesController {
  constructor(
    private readonly declaracoesService: DeclaracoesService,
    private readonly storage: StorageService,
  ) {}

  @Roles('ADMIN')
  @Get('admin')
  @Header('Cache-Control', 'private, no-store')
  listarAdmin(
    @Query(new ZodValidationPipe(listarDeclaracoesQuerySchema)) query: ListarDeclaracoesQuery,
  ) {
    return this.declaracoesService.listarAdmin(query);
  }

  @Roles('AFILIADO')
  @Get('minhas')
  @Header('Cache-Control', 'private, no-store')
  listarMinhas(@CurrentUser() user: RequestUser) {
    return this.declaracoesService.listarDoAfiliado(user);
  }

  /**
   * Rubrica que o PDF desenha acima do carimbo. Fica no branding do sindicato,
   * então cada tenant tem a sua.
   */
  @Roles('ADMIN')
  @Post('assinatura')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: RUBRICA_MAX_BYTES } }))
  async enviarAssinatura(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadAssinaturaResponse> {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    if (!RUBRICA_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Envie a assinatura em PNG, JPEG ou WebP');
    }
    const url = await this.storage.salvar(file.buffer, file.originalname);
    await this.declaracoesService.definirAssinatura(url);
    return { url };
  }

  @Roles('ADMIN')
  @Delete('assinatura')
  async removerAssinatura() {
    await this.declaracoesService.definirAssinatura(null);
    return { ok: true };
  }

  @Roles('ADMIN', 'AFILIADO', 'SUPERADMIN')
  @Get(':id/arquivo')
  async baixar(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('versao') versao?: string,
  ): Promise<StreamableFile> {
    const { buffer, nomeArquivo } = await this.declaracoesService.baixar(
      user,
      id,
      versao === 'assinada' ? 'assinada' : 'original',
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nomeArquivo}"`,
    });
  }

  /** Assinatura pela plataforma: reemite o PDF já com a rubrica cadastrada. */
  @Roles('ADMIN')
  @Post(':id/assinar')
  assinar(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.declaracoesService.assinarComRubrica(user, id);
  }

  @Roles('ADMIN')
  @Post(':id/assinada')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PDF_MAX_BYTES } }))
  async enviarAssinada(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Envie a declaração assinada em PDF');
    }
    return this.declaracoesService.registrarAssinatura(user, id, file.buffer, file.originalname);
  }

  @Roles('ADMIN')
  @Delete(':id/assinada')
  removerAssinada(@Param('id') id: string) {
    return this.declaracoesService.removerAssinatura(id);
  }
}
