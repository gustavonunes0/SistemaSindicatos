import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { PlataformaController } from './plataforma.controller';

@Module({
  imports: [TenantModule],
  controllers: [PlataformaController],
})
export class PlataformaModule {}
