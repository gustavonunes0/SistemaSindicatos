import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { pushSubscriptionSchema, type PushSubscriptionInput } from '@sindprf/types';
import { Public } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Public()
  @Get('vapid-public-key')
  chavePublica() {
    const publicKey = this.pushService.getPublicKey();
    if (!publicKey) {
      throw new NotFoundException('Push não configurado');
    }
    return { publicKey };
  }

  @Public()
  @Post('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  async inscrever(
    @Body(new ZodValidationPipe(pushSubscriptionSchema)) body: PushSubscriptionInput,
    @Headers('user-agent') userAgent?: string,
  ): Promise<void> {
    await this.pushService.salvarInscricao(body, userAgent);
  }

  @Public()
  @Post('unsubscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelar(
    @Body(new ZodValidationPipe(pushSubscriptionSchema.pick({ endpoint: true })))
    body: { endpoint: string },
  ): Promise<void> {
    await this.pushService.removerInscricao(body.endpoint);
  }
}
