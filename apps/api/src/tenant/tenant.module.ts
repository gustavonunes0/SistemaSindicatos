import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantMiddleware } from './tenant.middleware';
import { TenantService } from './tenant.service';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
