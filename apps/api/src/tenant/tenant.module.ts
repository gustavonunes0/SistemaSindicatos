import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantService } from './tenant.service';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
