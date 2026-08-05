import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  atualizarTenantPlataformaSchema,
  criarDominioPlataformaSchema,
  type AtualizarTenantPlataformaInput,
  type CriarDominioPlataformaInput,
} from '@sindprf/types';
import { Roles } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TenantService } from '../tenant/tenant.service';

@Controller('plataforma')
export class PlataformaController {
  constructor(private readonly tenants: TenantService) {}

  @Roles('SUPERADMIN')
  @Get('tenants')
  listarTenants() {
    return this.tenants.listarSindicatos();
  }

  @Roles('SUPERADMIN')
  @Get('tenants/:id')
  buscarTenant(@Param('id') id: string) {
    return this.tenants.buscarSindicato(id);
  }

  @Roles('SUPERADMIN')
  @Patch('tenants/:id')
  atualizarTenant(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(atualizarTenantPlataformaSchema)) body: AtualizarTenantPlataformaInput,
  ) {
    return this.tenants.atualizarSindicato(id, body);
  }

  @Roles('SUPERADMIN')
  @Post('tenants/:id/domains')
  adicionarDominio(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(criarDominioPlataformaSchema)) body: CriarDominioPlataformaInput,
  ) {
    return this.tenants.adicionarDominio(id, body);
  }

  @Roles('SUPERADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('tenants/:id/domains/:domainId')
  async removerDominio(@Param('id') id: string, @Param('domainId') domainId: string) {
    await this.tenants.removerDominio(id, domainId);
  }

  @Roles('SUPERADMIN')
  @Post('tenants/:id/domains/:domainId/primario')
  definirPrimario(@Param('id') id: string, @Param('domainId') domainId: string) {
    return this.tenants.definirDominioPrimario(id, domainId);
  }
}
