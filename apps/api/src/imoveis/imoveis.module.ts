import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { ImoveisController } from './imoveis.controller';
import { ImoveisService } from './imoveis.service';

@Module({
  imports: [TenantModule],
  controllers: [ImoveisController],
  providers: [ImoveisService],
})
export class ImoveisModule {}
