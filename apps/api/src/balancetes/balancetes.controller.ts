import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import {
  importarBalanceteCamposSchema,
  type ImportarBalanceteCampos,
} from '@sindprf/types';
import { Roles } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BalancetesService } from './balancetes.service';

@Controller('balancetes')
export class BalancetesController {
  constructor(private readonly balancetesService: BalancetesService) {}

  @Roles('ADMIN')
  @Get()
  listar() {
    return this.balancetesService.listar().then((itens) =>
      itens.map((item) => ({
        ...item,
        totalReceitas: Number(item.totalReceitas),
        totalDespesas: Number(item.totalDespesas),
        resultado: Number(item.resultado),
      })),
    );
  }

  /** Portal de transparência: totais mensais sem metadados internos. */
  @Roles('AFILIADO')
  @Get('transparencia')
  @Header('Cache-Control', 'private, no-store')
  listarTransparencia() {
    return this.balancetesService.listarTransparencia();
  }

  /** Detalhe por competência: só categorias agregadas, sem plano de contas. */
  @Roles('AFILIADO')
  @Get('transparencia/:id')
  @Header('Cache-Control', 'private, no-store')
  detalheTransparencia(@Param('id') id: string) {
    return this.balancetesService.detalheTransparencia(id);
  }

  @Roles('ADMIN')
  @Post('importar')
  importar(
    @Body(new ZodValidationPipe(importarBalanceteCamposSchema)) body: ImportarBalanceteCampos,
  ) {
    return this.balancetesService.importarTexto({
      texto: body.texto,
      arquivoNome: body.arquivoNome,
    });
  }

  @Roles('ADMIN')
  @Get(':id')
  detalhe(@Param('id') id: string) {
    return this.balancetesService.detalhe(id);
  }
}
