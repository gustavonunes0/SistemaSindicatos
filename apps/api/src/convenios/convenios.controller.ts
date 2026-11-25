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
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  atualizarConvenioSchema,
  criarConvenioSchema,
  definirLinkCategoriaSchema,
  emitirDeclaracaoSchema,
  filtroConveniosSchema,
  uploadContratoConvenioResponseSchema,
  uploadTabelaConvenioResponseSchema,
  type AtualizarConvenioInput,
  type CriarConvenioInput,
  type DefinirLinkCategoriaInput,
  type EmitirDeclaracaoInput,
  type FiltroConveniosInput,
  type UploadContratoConvenioResponse,
  type UploadTabelaConvenioResponse,
} from '@sindprf/types';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StorageService } from '../storage/storage.service';
import { ConveniosService } from './convenios.service';

/** Tabelas/flyers em alta resolução; alinhado ao limite de anexos/estatutos. */
const TABELA_MAX_BYTES = 50 * 1024 * 1024;
const TABELA_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CONTRATO_MAX_BYTES = 50 * 1024 * 1024;
const CONTRATO_MIMETYPES = ['application/pdf'];

@Controller('convenios')
export class ConveniosController {
  constructor(
    private readonly conveniosService: ConveniosService,
    private readonly storageService: StorageService,
  ) {}

  // ---- Gestão (ADMIN) ----
  @Roles('ADMIN')
  @Get('admin')
  @Header('Cache-Control', 'private, no-store')
  listarAdmin() {
    return this.conveniosService.listarAdmin();
  }

  @Roles('ADMIN')
  @Get('admin/:id')
  buscarAdmin(@Param('id') id: string) {
    return this.conveniosService.buscarAdmin(id);
  }

  /** Link exibido ao fim da listagem pública da categoria; `url` nula remove. */
  @Roles('ADMIN')
  @Put('categorias/link')
  definirLinkCategoria(
    @Body(new ZodValidationPipe(definirLinkCategoriaSchema)) body: DefinirLinkCategoriaInput,
  ) {
    return this.conveniosService.definirLinkCategoria(body);
  }

  @Roles('ADMIN')
  @Post('tabela')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: TABELA_MAX_BYTES } }))
  async uploadTabela(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadTabelaConvenioResponse> {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    if (!TABELA_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido: envie JPEG, PNG ou WebP');
    }
    const url = await this.storageService.salvar(file.buffer, file.originalname);
    return uploadTabelaConvenioResponseSchema.parse({ url });
  }

  @Roles('ADMIN')
  @Post('contrato')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CONTRATO_MAX_BYTES } }))
  async uploadContrato(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadContratoConvenioResponse> {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }
    if (!CONTRATO_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido: envie um PDF');
    }
    const url = await this.storageService.salvar(file.buffer, file.originalname);
    return uploadContratoConvenioResponseSchema.parse({ url });
  }

  @Roles('ADMIN')
  @Post()
  criar(@Body(new ZodValidationPipe(criarConvenioSchema)) body: CriarConvenioInput) {
    return this.conveniosService.criar(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarConvenioSchema)) body: AtualizarConvenioInput,
  ) {
    return this.conveniosService.atualizar(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.conveniosService.remover(id);
  }

  // ---- Validação pública (QR Code no PDF) ----
  @Public()
  @Get('declaracoes/:codigo')
  validarDeclaracao(@Param('codigo') codigo: string) {
    return this.conveniosService.validarDeclaracao(codigo);
  }

  // ---- Consulta pública (site institucional + área do afiliado) ----
  @Public()
  @Get('categorias')
  listarCategorias() {
    return this.conveniosService.listarCategorias();
  }

  @Public()
  @Get()
  listar(@Query(new ZodValidationPipe(filtroConveniosSchema)) query: FiltroConveniosInput) {
    return this.conveniosService.listarPublico(query);
  }

  @Roles('ADMIN', 'AFILIADO', 'SUPERADMIN')
  @Post(':id/declaracao')
  @Header('Content-Type', 'application/pdf')
  async emitirDeclaracao(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(emitirDeclaracaoSchema)) body: EmitirDeclaracaoInput,
  ): Promise<StreamableFile> {
    const { buffer, nomeArquivo } = await this.conveniosService.emitirDeclaracao(user, id, body);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nomeArquivo}"`,
    });
  }

  @Public()
  @Get(':id')
  buscar(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    const revelarContrato =
      user?.role === 'AFILIADO' || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    return this.conveniosService.buscarPublico(id, revelarContrato);
  }
}
