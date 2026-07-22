import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  adicionarMembroComissaoSchema,
  atualizarCandidatoSchema,
  atualizarChapaSchema,
  atualizarEleicaoSchema,
  criarCandidatoSchema,
  criarChapaSchema,
  criarEleicaoSchema,
  homologarChapaSchema,
  incluirElegivelSchema,
  resolverAclamacaoSchema,
  resolverContestacaoSchema,
  type AdicionarMembroComissaoInput,
  type AtualizarCandidatoInput,
  type AtualizarChapaInput,
  type AtualizarEleicaoInput,
  type CriarCandidatoInput,
  type CriarChapaInput,
  type CriarEleicaoInput,
  type HomologarChapaInput,
  type IncluirElegivelInput,
  type ResolverAclamacaoInput,
  type ResolverContestacaoInput,
} from '@sindprf/types';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApuracaoService } from './apuracao.service';
import { ChapaService } from './chapa.service';
import { ComissaoService } from './comissao.service';
import { ContestacaoService } from './contestacao.service';
import { ElegibilidadeService } from './elegibilidade.service';
import { EleicaoService } from './eleicao.service';

// Rotas de gestão (ADMIN/Comissão Eleitoral). Registrado ANTES de
// VotacaoController no módulo para que /eleicoes/admin (literal) seja
// resolvido antes de /eleicoes/:id (parametrizado) — mesmo truque de
// ordenação usado em ConveniosController/ImoveisController.
@Roles('ADMIN')
@Controller('eleicoes')
export class EleicaoController {
  constructor(
    private readonly eleicaoService: EleicaoService,
    private readonly chapaService: ChapaService,
    private readonly elegibilidadeService: ElegibilidadeService,
    private readonly contestacaoService: ContestacaoService,
    private readonly comissaoService: ComissaoService,
    private readonly apuracaoService: ApuracaoService,
  ) {}

  @Post()
  criar(@Body(new ZodValidationPipe(criarEleicaoSchema)) body: CriarEleicaoInput) {
    return this.eleicaoService.criar(body);
  }

  @Get('admin')
  listarAdmin() {
    return this.eleicaoService.listarAdmin();
  }

  @Get('admin/:id')
  buscarAdmin(@Param('id') id: string) {
    return this.eleicaoService.buscarAdminDetalhe(id);
  }

  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarEleicaoSchema)) body: AtualizarEleicaoInput,
  ) {
    return this.eleicaoService.atualizar(id, body);
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.eleicaoService.remover(id);
  }

  @Post(':id/chapas')
  criarChapa(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(criarChapaSchema)) body: CriarChapaInput,
  ) {
    return this.chapaService.criar(id, body);
  }

  @Patch(':id/chapas/:chapaId')
  atualizarChapa(
    @Param('id') id: string,
    @Param('chapaId') chapaId: string,
    @Body(new ZodValidationPipe(atualizarChapaSchema)) body: AtualizarChapaInput,
  ) {
    return this.chapaService.atualizar(id, chapaId, body);
  }

  @Delete(':id/chapas/:chapaId')
  removerChapa(@Param('id') id: string, @Param('chapaId') chapaId: string) {
    return this.chapaService.remover(id, chapaId);
  }

  @Patch(':id/chapas/:chapaId/homologar')
  homologarChapa(
    @Param('id') id: string,
    @Param('chapaId') chapaId: string,
    @Body(new ZodValidationPipe(homologarChapaSchema)) body: HomologarChapaInput,
  ) {
    return this.chapaService.homologar(id, chapaId, body);
  }

  @Post(':id/chapas/:chapaId/candidatos')
  criarCandidato(
    @Param('id') id: string,
    @Param('chapaId') chapaId: string,
    @Body(new ZodValidationPipe(criarCandidatoSchema)) body: CriarCandidatoInput,
  ) {
    return this.chapaService.criarCandidato(id, chapaId, body);
  }

  @Patch(':id/chapas/:chapaId/candidatos/:candidatoId')
  atualizarCandidato(
    @Param('id') id: string,
    @Param('chapaId') chapaId: string,
    @Param('candidatoId') candidatoId: string,
    @Body(new ZodValidationPipe(atualizarCandidatoSchema)) body: AtualizarCandidatoInput,
  ) {
    return this.chapaService.atualizarCandidato(id, chapaId, candidatoId, body);
  }

  @Delete(':id/chapas/:chapaId/candidatos/:candidatoId')
  removerCandidato(
    @Param('id') id: string,
    @Param('chapaId') chapaId: string,
    @Param('candidatoId') candidatoId: string,
  ) {
    return this.chapaService.removerCandidato(id, chapaId, candidatoId);
  }

  @Post(':id/elegiveis/sincronizar')
  sincronizarElegiveis(@Param('id') id: string) {
    return this.elegibilidadeService.sincronizar(id);
  }

  @Get(':id/elegiveis')
  listarElegiveis(@Param('id') id: string) {
    return this.elegibilidadeService.listar(id);
  }

  @Post(':id/elegiveis')
  incluirElegivel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(incluirElegivelSchema)) body: IncluirElegivelInput,
  ) {
    return this.elegibilidadeService.incluir(id, body);
  }

  @Delete(':id/elegiveis/:afiliadoId')
  removerElegivel(@Param('id') id: string, @Param('afiliadoId') afiliadoId: string) {
    return this.elegibilidadeService.remover(id, afiliadoId);
  }

  @Get(':id/contestacoes')
  listarContestacoes(@Param('id') id: string) {
    return this.contestacaoService.listar(id);
  }

  @Patch(':id/contestacoes/:contestacaoId')
  resolverContestacao(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('contestacaoId') contestacaoId: string,
    @Body(new ZodValidationPipe(resolverContestacaoSchema)) body: ResolverContestacaoInput,
  ) {
    return this.contestacaoService.resolver(user.id, id, contestacaoId, body);
  }

  @Get(':id/comissao')
  listarComissao(@Param('id') id: string) {
    return this.comissaoService.listar(id);
  }

  @Post(':id/comissao')
  adicionarMembroComissao(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adicionarMembroComissaoSchema)) body: AdicionarMembroComissaoInput,
  ) {
    return this.comissaoService.adicionar(id, body);
  }

  @Delete(':id/comissao/:userId')
  removerMembroComissao(@Param('id') id: string, @Param('userId') userId: string) {
    return this.comissaoService.remover(id, userId);
  }

  @Post(':id/abrir')
  abrir(@Param('id') id: string) {
    return this.eleicaoService.abrir(id);
  }

  @Post(':id/encerrar')
  encerrar(@Param('id') id: string) {
    return this.eleicaoService.encerrar(id);
  }

  @Post(':id/apurar')
  apurar(@Param('id') id: string) {
    return this.apuracaoService.apurar(id);
  }

  @Post(':id/aclamacao')
  resolverAclamacao(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resolverAclamacaoSchema)) body: ResolverAclamacaoInput,
  ) {
    return this.apuracaoService.resolverPorAclamacao(id, body.chapaId);
  }
}
