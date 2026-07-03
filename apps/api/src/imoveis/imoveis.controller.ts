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
  atualizarImovelSchema,
  consultaDisponibilidadeSchema,
  criarImovelSchema,
  criarPeriodoSchema,
  filtroImoveisSchema,
  type AtualizarImovelInput,
  type ConsultaDisponibilidadeInput,
  type CriarImovelInput,
  type CriarPeriodoInput,
  type FiltroImoveisInput,
} from '@sindprf/types';
import { Roles } from '../common/decorators';
import { AfiliadoAprovadoGuard } from '../common/guards/afiliado-aprovado.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StorageService } from '../storage/storage.service';
import { ImoveisService } from './imoveis.service';

const FOTO_MAX_BYTES = 5 * 1024 * 1024;
const FOTO_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FOTOS_MAX = 10;

@Controller('imoveis')
export class ImoveisController {
  constructor(
    private readonly imoveisService: ImoveisService,
    private readonly storageService: StorageService,
  ) {}

  // ---- Gestão (ADMIN) ----
  @Roles('ADMIN')
  @Get('admin')
  listarAdmin() {
    return this.imoveisService.listarAdmin();
  }

  @Roles('ADMIN')
  @Get('admin/:id')
  buscarAdmin(@Param('id') id: string) {
    return this.imoveisService.buscarAdmin(id);
  }

  @Roles('ADMIN')
  @Get('admin/:id/periodos')
  listarPeriodosAdmin(@Param('id') id: string) {
    return this.imoveisService.listarPeriodos(id);
  }

  @Roles('ADMIN')
  @Post()
  criar(@Body(new ZodValidationPipe(criarImovelSchema)) body: CriarImovelInput) {
    return this.imoveisService.criar(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarImovelSchema)) body: AtualizarImovelInput,
  ) {
    return this.imoveisService.atualizar(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.imoveisService.remover(id);
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
    const urls = await Promise.all(
      files.map((file) => this.storageService.salvar(file.buffer, file.originalname)),
    );
    return this.imoveisService.adicionarFotos(id, urls);
  }

  @Roles('ADMIN')
  @Delete(':id/fotos/:fotoId')
  removerFoto(@Param('id') id: string, @Param('fotoId') fotoId: string) {
    return this.imoveisService.removerFoto(id, fotoId);
  }

  @Roles('ADMIN')
  @Post(':id/periodos')
  criarPeriodo(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(criarPeriodoSchema)) body: CriarPeriodoInput,
  ) {
    return this.imoveisService.criarPeriodo(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id/periodos/:periodoId')
  removerPeriodo(@Param('id') id: string, @Param('periodoId') periodoId: string) {
    return this.imoveisService.removerPeriodo(id, periodoId);
  }

  // ---- Consulta (AFILIADO aprovado) ----
  @UseGuards(AfiliadoAprovadoGuard)
  @Get()
  listar(@Query(new ZodValidationPipe(filtroImoveisSchema)) query: FiltroImoveisInput) {
    return this.imoveisService.listarPublico(query);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get(':id/disponibilidade')
  disponibilidade(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(consultaDisponibilidadeSchema)) query: ConsultaDisponibilidadeInput,
  ) {
    return this.imoveisService.consultarDisponibilidade(id, query);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.imoveisService.buscarPublico(id);
  }
}
