import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AfiliadosModule } from './afiliados/afiliados.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BalancetesModule } from './balancetes/balancetes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PerfilInterceptor } from './common/perfil.interceptor';
import { ConveniosModule } from './convenios/convenios.module';
import { ContatoModule } from './contato/contato.module';
import { D8Module } from './d8/d8.module';
import { EleicaoModule } from './eleicao/eleicao.module';
import { ImoveisModule } from './imoveis/imoveis.module';
import { InstagramModule } from './instagram/instagram.module';
import { NoticiasModule } from './noticias/noticias.module';
import { PushModule } from './push/push.module';
import { SolicitacoesModule } from './solicitacoes/solicitacoes.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { TenantAlsInterceptor } from './tenant/tenant-als.interceptor';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { TenantModule } from './tenant/tenant.module';
import { PlataformaModule } from './plataforma/plataforma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'auth', ttl: 60_000, limit: 10 },
      { name: 'cadastro', ttl: 60_000, limit: 5 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    TenantModule,
    PlataformaModule,
    StorageModule,
    AuthModule,
    AdminModule,
    AfiliadosModule,
    NoticiasModule,
    PushModule,
    InstagramModule,
    ConveniosModule,
    ContatoModule,
    ImoveisModule,
    SolicitacoesModule,
    EleicaoModule,
    D8Module,
    BalancetesModule,
  ],
  controllers: [AppController],
  providers: [
    TenantMiddleware,
    // Antes do tenant: mede a requisição inteira, inclusive a resolução de tenant.
    { provide: APP_INTERCEPTOR, useClass: PerfilInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantAlsInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // OPTIONS é tratado dentro do middleware (não excluir com path '*' — quebra o match).
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: '/', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
