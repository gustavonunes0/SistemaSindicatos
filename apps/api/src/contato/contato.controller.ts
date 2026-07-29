import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { enviarContatoSchema, type EnviarContatoInput } from '@sindprf/types';
import { Public } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ContatoService } from './contato.service';

@Controller('contato')
export class ContatoController {
  constructor(private readonly contatoService: ContatoService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ cadastro: { limit: 5, ttl: 60_000 } })
  @SkipThrottle({ auth: true })
  @Post()
  @HttpCode(HttpStatus.OK)
  enviar(@Body(new ZodValidationPipe(enviarContatoSchema)) body: EnviarContatoInput) {
    return this.contatoService.enviar(body);
  }
}
