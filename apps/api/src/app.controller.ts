import { Controller, Get } from '@nestjs/common';
import { healthCheckSchema, type HealthCheck } from '@sindprf/types';

@Controller()
export class AppController {
  @Get()
  health(): HealthCheck {
    return healthCheckSchema.parse({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
}
