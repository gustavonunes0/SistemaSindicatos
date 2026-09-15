import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  definirDestaqueInstagramSchema,
  type DefinirDestaqueInstagramInput,
  type InstagramPost,
} from '@sindprf/types';
import { Public, Roles } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { InstagramService } from './instagram.service';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Public()
  @Get('feed')
  feed(@Query('destaques') destaques?: string): Promise<InstagramPost[]> {
    return this.instagramService.feed(destaques === '1' || destaques === 'true');
  }

  @Roles('ADMIN')
  @Get('admin')
  listarAdmin(): Promise<InstagramPost[]> {
    return this.instagramService.listarAdmin();
  }

  @Roles('ADMIN')
  @Patch(':id/destaque')
  definirDestaque(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(definirDestaqueInstagramSchema))
    body: DefinirDestaqueInstagramInput,
  ): Promise<InstagramPost> {
    return this.instagramService.definirDestaque(id, body.destaque);
  }
}
