import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  criarContestacaoSchema,
  votarInputSchema,
  type CriarContestacaoInput,
  type VotarInput,
} from '@sindprf/types';
import { CurrentUser } from '../common/decorators';
import { AfiliadoAprovadoGuard } from '../common/guards/afiliado-aprovado.guard';
import type { RequestUser } from '../common/request-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApuracaoService } from './apuracao.service';
import { ContestacaoService } from './contestacao.service';
import { EleicaoService } from './eleicao.service';
import { VotacaoService } from './votacao.service';

// Rotas de consulta/votação (AFILIADO). Registrado DEPOIS de
// EleicaoController no módulo (ver nota lá) para que /eleicoes/:id não
// capture literais como /eleicoes/admin antes da hora.
@Controller('eleicoes')
export class VotacaoController {
  constructor(
    private readonly eleicaoService: EleicaoService,
    private readonly votacaoService: VotacaoService,
    private readonly apuracaoService: ApuracaoService,
    private readonly contestacaoService: ContestacaoService,
  ) {}

  @UseGuards(AfiliadoAprovadoGuard)
  @Get()
  listar() {
    return this.eleicaoService.listarVisiveis();
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.eleicaoService.buscarDetalhePublico(id);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Get(':id/meu-status')
  meuStatus(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.votacaoService.meuStatus(user.id, id);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Post(':id/votar')
  votar(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(votarInputSchema)) body: VotarInput,
  ) {
    return this.votacaoService.votar(user.id, id, body.chapaId);
  }

  @UseGuards(AfiliadoAprovadoGuard)
  @Post(':id/chapas/:chapaId/contestacoes')
  criarContestacao(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('chapaId') chapaId: string,
    @Body(new ZodValidationPipe(criarContestacaoSchema)) body: CriarContestacaoInput,
  ) {
    return this.contestacaoService.criar(user.id, id, chapaId, body);
  }

  // Fora do AfiliadoAprovadoGuard (só JwtAuthGuard global): a autorização
  // real é decidida dentro do service pelo status da eleição — nem admin
  // vê resultado antes de APURADA (.cursor/rules/eleicao.mdc).
  @Get(':id/resultado')
  resultado(@Param('id') id: string) {
    return this.apuracaoService.resultado(id);
  }
}
