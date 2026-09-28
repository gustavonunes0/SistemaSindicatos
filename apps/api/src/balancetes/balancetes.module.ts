import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { BalancetesController } from './balancetes.controller';
import { BalancetesService } from './balancetes.service';

@Module({
  imports: [TenantModule],
  controllers: [BalancetesController],
  providers: [BalancetesService],
})
export class BalancetesModule {}
