import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AfiliadosModule } from './afiliados/afiliados.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ConveniosModule } from './convenios/convenios.module';
import { D8Module } from './d8/d8.module';
import { EleicaoModule } from './eleicao/eleicao.module';
import { ImoveisModule } from './imoveis/imoveis.module';
import { InstagramModule } from './instagram/instagram.module';
import { NoticiasModule } from './noticias/noticias.module';
import { PushModule } from './push/push.module';
import { SolicitacoesModule } from './solicitacoes/solicitacoes.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'auth', ttl: 60_000, limit: 10 },
      { name: 'cadastro', ttl: 60_000, limit: 5 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    AfiliadosModule,
    NoticiasModule,
    PushModule,
    InstagramModule,
    ConveniosModule,
    ImoveisModule,
    SolicitacoesModule,
    EleicaoModule,
    D8Module,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
