import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  atualizarConvenioSchema,
  criarConvenioSchema,
  filtroConveniosSchema,
  type AtualizarConvenioInput,
  type CriarConvenioInput,
  type FiltroConveniosInput,
} from '@sindprf/types';
import { Roles } from '../common/decorators';
import { AfiliadoAprovadoGuard } from '../common/guards/afiliado-aprovado.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ConveniosService } from './convenios.service';

@Controller('convenios')
export class ConveniosController {
  constructor(private readonly conveniosService: ConveniosService) {}

  // ---- Gestão (ADMIN) ----
  @Roles('ADMIN')
  @Get('admin')
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

  // ---- Consulta (AFILIADO aprovado) ----
  @UseGuards(AfiliadoAprovadoGuard)
  @Get('categorias')
  listarCategorias() {
    return this.conveniosService.listarCategorias();
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get()
  listar(@Query(new ZodValidationPipe(filtroConveniosSchema)) query: FiltroConveniosInput) {
    return this.conveniosService.listarPublico(query);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.conveniosService.buscarPublico(id);
  }
}
