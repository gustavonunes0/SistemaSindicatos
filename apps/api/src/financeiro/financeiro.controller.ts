import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  cadastrarContaFinanceiraSchema,
  importacaoFinanceiraDetalheQuerySchema,
  importarFinanceiroInputSchema,
  paginacaoFinanceiraQuerySchema,
  previewImportacaoFinanceiraInputSchema,
  type CadastrarContaFinanceira,
  type ImportacaoFinanceiraDetalheQuery,
  type ImportarFinanceiroInput,
  type PaginacaoFinanceiraQuery,
  type PreviewImportacaoFinanceiraInput,
} from '@sindprf/types';
import { Roles } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FinanceiroService } from './financeiro.service';

@Roles('ADMIN')
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('contas')
  listarContas() {
    return this.financeiroService.listarContas();
  }

  @Post('contas')
  cadastrarConta(
    @Body(new ZodValidationPipe(cadastrarContaFinanceiraSchema)) body: CadastrarContaFinanceira,
  ) {
    return this.financeiroService.cadastrarConta(body);
  }

  @Post('importacoes/preview')
  preview(
    @Body(new ZodValidationPipe(previewImportacaoFinanceiraInputSchema))
    body: PreviewImportacaoFinanceiraInput,
  ) {
    return this.financeiroService.preview(body);
  }

  @Post('importacoes')
  importar(
    @Body(new ZodValidationPipe(importarFinanceiroInputSchema)) body: ImportarFinanceiroInput,
  ) {
    return this.financeiroService.importar(body);
  }

  @Get('importacoes')
  listar(
    @Query(new ZodValidationPipe(paginacaoFinanceiraQuerySchema))
    query: PaginacaoFinanceiraQuery,
  ) {
    return this.financeiroService.listar(query);
  }

  @Get('importacoes/:id')
  detalhe(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(importacaoFinanceiraDetalheQuerySchema))
    query: ImportacaoFinanceiraDetalheQuery,
  ) {
    return this.financeiroService.detalhe(id, query);
  }
}
