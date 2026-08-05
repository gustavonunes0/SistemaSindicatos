import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/decorators';
import { TenantService } from '../tenant/tenant.service';

@Controller('plataforma')
export class PlataformaController {
  constructor(private readonly tenants: TenantService) {}

  @Roles('SUPERADMIN')
  @Get('tenants')
  listarTenants() {
    return this.tenants.listarSindicatos();
  }
}
