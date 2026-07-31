import { Module } from '@nestjs/common';
import { ConveniosController } from './convenios.controller';
import { ConveniosService } from './convenios.service';
import { DeclaracaoPdfService } from './declaracao-pdf.service';

@Module({
  controllers: [ConveniosController],
  providers: [ConveniosService, DeclaracaoPdfService],
})
export class ConveniosModule {}
