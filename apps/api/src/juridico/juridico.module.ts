import { Module } from '@nestjs/common';
import { JuridicoController } from './juridico.controller';
import { JuridicoService } from './juridico.service';

@Module({
  controllers: [JuridicoController],
  providers: [JuridicoService],
})
export class JuridicoModule {}
