import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { EstatutosController } from './estatutos.controller';
import { EstatutosService } from './estatutos.service';

@Module({
  imports: [StorageModule],
  controllers: [EstatutosController],
  providers: [EstatutosService],
})
export class EstatutosModule {}
