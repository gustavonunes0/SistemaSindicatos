import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  importarD8CamposSchema,
  listarLinhasD8QuerySchema,
  type ImportarD8Campos,
  type ListarLinhasD8Query,
} from '@sindprf/types';
import { Roles } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { D8Service } from './d8.service';

@Controller('d8')
export class D8Controller {
  constructor(private readonly d8Service: D8Service) {}

  @Roles('ADMIN')
  @Get()
  listar() {
    return this.d8Service.listar().then((itens) =>
      itens.map((item) => ({
        ...item,
        totalValor: Number(item.totalValor),
      })),
    );
  }

  @Roles('ADMIN')
  @Post('importar')
  importar(@Body(new ZodValidationPipe(importarD8CamposSchema)) body: ImportarD8Campos) {
    return this.d8Service.importarTexto({
      texto: body.texto,
      tipo: body.tipo,
      substituirBase: body.substituirBase,
      arquivoNome: body.arquivoNome,
    });
  }

  @Roles('ADMIN')
  @Get(':id')
  detalhe(@Param('id') id: string) {
    return this.d8Service.detalhe(id);
  }

  @Roles('ADMIN')
  @Get(':id/linhas')
  listarLinhas(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(listarLinhasD8QuerySchema)) query: ListarLinhasD8Query,
  ) {
    return this.d8Service.listarLinhas(id, query.filtro);
  }
}
