import { Module } from '@nestjs/common';
import { AfiliadosController } from './afiliados.controller';
import { AfiliadosService } from './afiliados.service';
import { PropostaFiliacaoPdfService } from './proposta-filiacao-pdf.service';

@Module({
  controllers: [AfiliadosController],
  providers: [AfiliadosService, PropostaFiliacaoPdfService],
})
export class AfiliadosModule {}
