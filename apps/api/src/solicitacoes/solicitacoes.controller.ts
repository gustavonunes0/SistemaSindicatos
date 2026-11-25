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
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  atualizarStatusSolicitacaoSchema,
  criarSolicitacaoPublicaSchema,
  criarSolicitacaoSchema,
  enviarMensagemSchema,
  filtroSolicitacoesAdminSchema,
  type AtualizarStatusSolicitacaoInput,
  type CriarSolicitacaoInput,
  type CriarSolicitacaoPublicaInput,
  type EnviarMensagemInput,
  type FiltroSolicitacoesAdminInput,
} from '@sindprf/types';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { AfiliadoAprovadoGuard } from '../common/guards/afiliado-aprovado.guard';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SolicitacoesService } from './solicitacoes.service';

@Controller('solicitacoes')
export class SolicitacoesController {
  constructor(private readonly solicitacoesService: SolicitacoesService) {}

  /** Pedido de hospedagem sem conta (filiado de outro estado / não filiado). */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ cadastro: { limit: 5, ttl: 60_000 } })
  @SkipThrottle({ auth: true })
  @Post('publica')
  criarPublica(
    @Body(new ZodValidationPipe(criarSolicitacaoPublicaSchema)) body: CriarSolicitacaoPublicaInput,
  ) {
    return this.solicitacoesService.criarPublica(body);
  }

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

  @Roles('ADMIN')
  @Post(':id/aprovar')
  aprovar(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.solicitacoesService.aprovar(user, id);
  }

  @Roles('ADMIN')
  @Post(':id/recusar')
  recusar(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.solicitacoesService.recusar(user, id);
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
