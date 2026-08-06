import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/decorators';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('ADMIN')
  @Get('metricas')
  metricas() {
    return this.adminService.metricas();
  }
}
