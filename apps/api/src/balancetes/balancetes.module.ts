import { Module } from '@nestjs/common';
import { BalancetesController } from './balancetes.controller';
import { BalancetesService } from './balancetes.service';

@Module({
  controllers: [BalancetesController],
  providers: [BalancetesService],
})
export class BalancetesModule {}
