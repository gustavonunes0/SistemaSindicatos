import { Controller, Get } from '@nestjs/common';
import type { InstagramPost } from '@sindprf/types';
import { Public } from '../common/decorators';
import { InstagramService } from './instagram.service';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Public()
  @Get('feed')
  feed(): Promise<InstagramPost[]> {
    return this.instagramService.feed();
  }
}
