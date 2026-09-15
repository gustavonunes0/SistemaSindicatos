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
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  atualizarEstatutoSchema,
  criarEstatutoSchema,
  type AtualizarEstatutoInput,
  type CriarEstatutoInput,
} from '@sindprf/types';
import { Roles } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EstatutosService } from './estatutos.service';

const PDF_MAX_BYTES = 20 * 1024 * 1024;

@Controller('estatutos')
export class EstatutosController {
  constructor(private readonly estatutosService: EstatutosService) {}

  @Roles('ADMIN')
  @Get('admin')
  @Header('Cache-Control', 'private, no-store')
  listarAdmin() {
    return this.estatutosService.listarAdmin();
  }

  @Roles('AFILIADO')
  @Get()
  @Header('Cache-Control', 'private, no-store')
  listarParaAfiliado() {
    return this.estatutosService.listarParaAfiliado();
  }

  @Roles('ADMIN')
  @Post()
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: PDF_MAX_BYTES } }))
  criar(
    @UploadedFile() arquivo: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(criarEstatutoSchema)) body: CriarEstatutoInput,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Envie o PDF do estatuto');
    }
    if (arquivo.mimetype !== 'application/pdf') {
      throw new BadRequestException('Formato inválido: envie um PDF');
    }
    return this.estatutosService.criar(body, arquivo);
  }

  @Roles('ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarEstatutoSchema)) body: AtualizarEstatutoInput,
  ) {
    return this.estatutosService.atualizar(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.estatutosService.remover(id);
  }

  @Roles('ADMIN')
  @Get('admin/:id/arquivo')
  async baixarAdmin(@Param('id') id: string): Promise<StreamableFile> {
    return this.streamArquivo(id, false);
  }

  @Roles('AFILIADO')
  @Get(':id/arquivo')
  async baixarAfiliado(@Param('id') id: string): Promise<StreamableFile> {
    return this.streamArquivo(id, true);
  }

  private async streamArquivo(id: string, apenasAtivos: boolean): Promise<StreamableFile> {
    const arquivo = await this.estatutosService.baixar(id, apenasAtivos);
    const nomeSeguro = encodeURIComponent(arquivo.nomeOriginal);
    return new StreamableFile(arquivo.buffer, {
      type: arquivo.mimeType,
      disposition: `inline; filename*=UTF-8''${nomeSeguro}`,
      length: arquivo.buffer.byteLength,
    });
  }
}
