import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  atualizarConvenioSchema,
  criarConvenioSchema,
  emitirDeclaracaoSchema,
  filtroConveniosSchema,
  type AtualizarConvenioInput,
  type CriarConvenioInput,
  type EmitirDeclaracaoInput,
  type FiltroConveniosInput,
} from '@sindprf/types';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ConveniosService } from './convenios.service';

@Controller('convenios')
export class ConveniosController {
  constructor(private readonly conveniosService: ConveniosService) {}

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
  buscar(@Param('id') id: string) {
    return this.conveniosService.buscarPublico(id);
  }
}
