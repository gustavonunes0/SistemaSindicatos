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
    const host =
      req.tenant?.host ??
      this.tenants.extrairHostDoRequest(
        req.headers as Record<string, string | string[] | undefined>,
      );
    const tenant = await this.tenants.resolverPorHost(host);
    return this.tenants.toPublicDto(tenant, host);
  }
}
