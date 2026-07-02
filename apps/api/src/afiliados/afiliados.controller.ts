import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  atualizarStatusAfiliadoSchema,
  cadastroAfiliadoSchema,
  filtroAfiliadosSchema,
  type AtualizarStatusAfiliadoInput,
  type CadastroAfiliadoInput,
  type FiltroAfiliadosInput,
} from '@sindprf/types';
import { Public, Roles } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AfiliadosService } from './afiliados.service';

@Controller('afiliados')
export class AfiliadosController {
  constructor(private readonly afiliadosService: AfiliadosService) {}

  @Public()
  @Post('cadastro')
  cadastrar(@Body(new ZodValidationPipe(cadastroAfiliadoSchema)) body: CadastroAfiliadoInput) {
    return this.afiliadosService.cadastrar(body);
  }

  @Roles('ADMIN')
  @Get()
  listar(@Query(new ZodValidationPipe(filtroAfiliadosSchema)) query: FiltroAfiliadosInput) {
    return this.afiliadosService.listar(query.status);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  atualizarStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarStatusAfiliadoSchema)) body: AtualizarStatusAfiliadoInput,
  ) {
    return this.afiliadosService.atualizarStatus(id, body.status);
  }
}
