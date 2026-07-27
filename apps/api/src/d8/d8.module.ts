import { Module } from '@nestjs/common';
import { D8Controller } from './d8.controller';
import { D8Service } from './d8.service';

@Module({
  controllers: [D8Controller],
  providers: [D8Service],
})
export class D8Module {}
