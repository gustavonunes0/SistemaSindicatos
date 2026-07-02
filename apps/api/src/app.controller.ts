import { Controller, Get } from '@nestjs/common';
import { healthCheckSchema, type HealthCheck } from '@sindprf/types';
import { Public } from './common/decorators';

@Controller()
export class AppController {
  @Public()
  @Get()
  health(): HealthCheck {
    return healthCheckSchema.parse({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
}
