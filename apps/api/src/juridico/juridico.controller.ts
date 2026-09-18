import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  listarAcoesJuridicasQuerySchema,
  type ListarAcoesJuridicasQuery,
} from '@sindprf/types';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JuridicoService } from './juridico.service';

const PLANILHA_MAX_BYTES = 5 * 1024 * 1024;
const PLANILHA_MIMETYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

@Controller('juridico')
export class JuridicoController {
  constructor(private readonly juridicoService: JuridicoService) {}

  @Roles('ADMIN')
  @Get('acoes')
  @Header('Cache-Control', 'private, no-store')
  listarAcoesAdmin(
    @Query(new ZodValidationPipe(listarAcoesJuridicasQuerySchema)) query: ListarAcoesJuridicasQuery,
  ) {
    return this.juridicoService.listarAcoesAdmin(query);
  }

  @Roles('ADMIN')
  @Get('importacoes')
  @Header('Cache-Control', 'private, no-store')
  listarImportacoes() {
    return this.juridicoService.listarImportacoes();
  }

  @Roles('ADMIN')
  @Get('importacoes/:id')
  @Header('Cache-Control', 'private, no-store')
  detalheImportacao(@Param('id') id: string) {
    return this.juridicoService.detalheImportacao(id);
  }

  @Roles('ADMIN')
  @Post('importar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PLANILHA_MAX_BYTES } }))
  async importar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }

    const extensao = file.originalname.toLowerCase();
    const mimeOk =
      PLANILHA_MIMETYPES.has(file.mimetype) ||
      extensao.endsWith('.xlsx') ||
      extensao.endsWith('.xls');

    if (!mimeOk) {
      throw new BadRequestException('Envie a planilha em formato Excel (.xlsx ou .xls)');
    }

    return this.juridicoService.importarPlanilha(file.buffer, file.originalname);
  }

  @Roles('AFILIADO')
  @Get('minhas')
  @Header('Cache-Control', 'private, no-store')
  listarMinhas(@CurrentUser() user: RequestUser) {
    return this.juridicoService.listarMinhas(user);
  }
}
