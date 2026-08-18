import { Module } from '@nestjs/common';
import { FormulariosController } from './formularios.controller';
import { FormulariosService } from './formularios.service';
import { RespostasService } from './respostas.service';

@Module({
  controllers: [FormulariosController],
  providers: [FormulariosService, RespostasService],
})
export class FormulariosModule {}
