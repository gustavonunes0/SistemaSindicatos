import { Module } from '@nestjs/common';
import { ConveniosController } from './convenios.controller';
import { ConveniosService } from './convenios.service';
import { DeclaracaoPdfService } from './declaracao-pdf.service';
import { DeclaracoesController } from './declaracoes.controller';
import { DeclaracoesService } from './declaracoes.service';

@Module({
  controllers: [ConveniosController, DeclaracoesController],
  providers: [ConveniosService, DeclaracaoPdfService, DeclaracoesService],
})
export class ConveniosModule {}
