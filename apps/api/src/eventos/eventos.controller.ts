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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  atualizarEventoSchema,
  criarEventoSchema,
  filtroEventosSchema,
  type AtualizarEventoInput,
  type CriarEventoInput,
  type FiltroEventosInput,
} from '@sindprf/types';
import { Roles } from '../common/decorators';
import { AfiliadoAprovadoGuard } from '../common/guards/afiliado-aprovado.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StorageService } from '../storage/storage.service';
import { EventosService } from './eventos.service';

const FOTO_MAX_BYTES = 8 * 1024 * 1024;
const FOTO_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FOTOS_MAX = 40;

@Controller('eventos')
export class EventosController {
  constructor(
    private readonly eventosService: EventosService,
    private readonly storageService: StorageService,
  ) {}

  @Roles('ADMIN')
  @Get('admin')
  listarAdmin() {
    return this.eventosService.listarAdmin();
  }

  @Roles('ADMIN')
  @Get('admin/:id')
  buscarAdmin(@Param('id') id: string) {
    return this.eventosService.buscarAdmin(id);
  }

  @Roles('ADMIN')
  @Post()
  criar(@Body(new ZodValidationPipe(criarEventoSchema)) body: CriarEventoInput) {
    return this.eventosService.criar(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarEventoSchema)) body: AtualizarEventoInput,
  ) {
    return this.eventosService.atualizar(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.eventosService.remover(id);
  }

  @Roles('ADMIN')
  @Post(':id/fotos')
  @UseInterceptors(
    FilesInterceptor('files', FOTOS_MAX, { limits: { fileSize: FOTO_MAX_BYTES } }),
  )
  async uploadFotos(
    @Param('id') id: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files?.length) {
      throw new BadRequestException('Envie ao menos uma foto');
    }
    for (const file of files) {
      if (!FOTO_MIMETYPES.includes(file.mimetype)) {
        throw new BadRequestException('Formato inválido: envie JPEG, PNG ou WebP');
      }
    }
    const arquivos = await Promise.all(
      files.map(async (file) => ({
        url: await this.storageService.salvar(file.buffer, file.originalname),
        nomeOriginal: file.originalname,
      })),
    );
    return this.eventosService.adicionarFotos(id, arquivos);
  }

  @Roles('ADMIN')
  @Delete(':id/fotos/:fotoId')
  removerFoto(@Param('id') id: string, @Param('fotoId') fotoId: string) {
    return this.eventosService.removerFoto(id, fotoId);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get()
  listar(@Query(new ZodValidationPipe(filtroEventosSchema)) query: FiltroEventosInput) {
    return this.eventosService.listarPublico(query);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.eventosService.buscarPublico(id);
  }
}
