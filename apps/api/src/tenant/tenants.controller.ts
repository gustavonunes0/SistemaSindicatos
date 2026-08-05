import { Controller, Get, Req } from '@nestjs/common';
import { Public } from '../common/decorators';
import type { RequestComTenant } from './tenant.middleware';
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantService) {}

  /** Bootstrap do front: marca/timezone do tenant resolvido pelo Host. */
  @Public()
  @Get('current')
  async current(@Req() req: RequestComTenant) {
    if (!req.tenant) {
      return null;
    }
    const tenant = await this.tenants.resolverPorHost(req.tenant.host);
    return this.tenants.toPublicDto(tenant, req.tenant.host);
  }
}
