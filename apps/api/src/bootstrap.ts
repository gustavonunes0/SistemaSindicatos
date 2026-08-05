import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { TenantService } from './tenant/tenant.service';

export async function configurarApp(app: NestExpressApplication): Promise<void> {
  const webUrl = (process.env.WEB_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
  const tenants = app.get(TenantService);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({
    origin: async (origin, callback) => {
      // Requests sem Origin (curl, health, same-origin server-side).
      if (!origin) {
        callback(null, true);
        return;
      }
      try {
        if (origin.replace(/\/+$/, '') === webUrl) {
          callback(null, true);
          return;
        }
        const ok = await tenants.isAllowedOrigin(origin);
        callback(null, ok);
      } catch {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Host'],
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
}

export async function criarApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await configurarApp(app);
  await app.init();
  return app;
}
