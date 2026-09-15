import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  atualizarRecursoDiretoriaSchema,
  criarRecursoDiretoriaSchema,
  type AtualizarRecursoDiretoriaInput,
  type CriarRecursoDiretoriaInput,
} from '@sindprf/types';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DiretoriaService } from './diretoria.service';

@Controller('diretoria')
export class DiretoriaController {
  constructor(private readonly diretoriaService: DiretoriaService) {}

  @Roles('ADMIN')
  @Get('recursos')
  listarAdmin() {
    return this.diretoriaService.listarAdmin();
  }

  @Roles('AFILIADO')
  @Get('recursos/meus')
  listarParaDiretor(@CurrentUser() user: RequestUser) {
    return this.diretoriaService.listarParaDiretor(user);
  }

  @Roles('ADMIN')
  @Post('recursos')
  criar(
    @Body(new ZodValidationPipe(criarRecursoDiretoriaSchema)) body: CriarRecursoDiretoriaInput,
  ) {
    return this.diretoriaService.criar(body);
  }

  @Roles('ADMIN')
  @Patch('recursos/:id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarRecursoDiretoriaSchema))
    body: AtualizarRecursoDiretoriaInput,
  ) {
    return this.diretoriaService.atualizar(id, body);
  }

  @Roles('ADMIN')
  @Delete('recursos/:id')
  remover(@Param('id') id: string) {
    return this.diretoriaService.remover(id);
  }
}
