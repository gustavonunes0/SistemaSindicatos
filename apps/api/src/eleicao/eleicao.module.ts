import { Module } from '@nestjs/common';
import { ApuracaoService } from './apuracao.service';
import { ChapaService } from './chapa.service';
import { ComissaoService } from './comissao.service';
import { ContestacaoService } from './contestacao.service';
import { ElegibilidadeService } from './elegibilidade.service';
import { EleicaoController } from './eleicao.controller';
import { EleicaoCron } from './eleicao.cron';
import { EleicaoService } from './eleicao.service';
import { VotacaoController } from './votacao.controller';
import { VotacaoService } from './votacao.service';

@Module({
  controllers: [EleicaoController, VotacaoController],
  providers: [
    EleicaoService,
    ChapaService,
    ElegibilidadeService,
    ContestacaoService,
    ComissaoService,
    VotacaoService,
    ApuracaoService,
    EleicaoCron,
  ],
})
export class EleicaoModule {}
