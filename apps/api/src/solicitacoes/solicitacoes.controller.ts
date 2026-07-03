import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  atualizarStatusSolicitacaoSchema,
  criarSolicitacaoSchema,
  enviarMensagemSchema,
  filtroSolicitacoesAdminSchema,
  type AtualizarStatusSolicitacaoInput,
  type CriarSolicitacaoInput,
  type EnviarMensagemInput,
  type FiltroSolicitacoesAdminInput,
} from '@sindprf/types';
import { CurrentUser, Roles } from '../common/decorators';
import { AfiliadoAprovadoGuard } from '../common/guards/afiliado-aprovado.guard';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SolicitacoesService } from './solicitacoes.service';

@Controller('solicitacoes')
export class SolicitacoesController {
  constructor(private readonly solicitacoesService: SolicitacoesService) {}

  @UseGuards(AfiliadoAprovadoGuard)
  @Post()
  criar(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(criarSolicitacaoSchema)) body: CriarSolicitacaoInput,
  ) {
    return this.solicitacoesService.criar(user, body);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get('minhas')
  listarMinhas(@CurrentUser() user: RequestUser) {
    return this.solicitacoesService.listarMinhas(user);
  }

  @Roles('ADMIN')
  @Get('admin')
  listarAdmin(
    @Query(new ZodValidationPipe(filtroSolicitacoesAdminSchema)) query: FiltroSolicitacoesAdminInput,
  ) {
    return this.solicitacoesService.listarAdmin(query);
  }

  @Get(':id')
  buscar(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.solicitacoesService.buscar(user, id);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  atualizarStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarStatusSolicitacaoSchema)) body: AtualizarStatusSolicitacaoInput,
  ) {
    return this.solicitacoesService.atualizarStatus(user, id, body);
  }

  @Get(':id/mensagens')
  listarMensagens(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.solicitacoesService.listarMensagens(user, id);
  }

  @Post(':id/mensagens')
  enviarMensagem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(enviarMensagemSchema)) body: EnviarMensagemInput,
  ) {
    return this.solicitacoesService.enviarMensagem(user, id, body);
  }
}
