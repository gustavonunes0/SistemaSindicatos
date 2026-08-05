import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { TenantService } from './tenant/tenant.service';

function originsEstaticosPermitidos(): Set<string> {
  const set = new Set<string>();
  const add = (raw: string | undefined) => {
    for (const parte of (raw ?? '').split(',')) {
      const v = parte.trim().replace(/\/+$/, '');
      if (!v) continue;
      if (v.startsWith('http://') || v.startsWith('https://')) {
        set.add(v);
        continue;
      }
      // Host sem scheme (TENANT_SEED_HOSTS / PLATFORM_SEED_HOSTS)
      set.add(`https://${v}`);
      set.add(`http://${v}`);
    }
  };
  add(process.env.WEB_URL);
  add(process.env.CORS_ORIGINS);
  add(process.env.TENANT_SEED_HOSTS);
  add(process.env.PLATFORM_SEED_HOSTS);
  return set;
}

export async function configurarApp(app: NestExpressApplication): Promise<void> {
  const originsFixos = originsEstaticosPermitidos();
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
        const normalizado = origin.replace(/\/+$/, '');
        if (originsFixos.has(normalizado)) {
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
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Host',
      'X-Requested-With',
    ],
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
}

export async function criarApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await configurarApp(app);
  await app.init();
  return app;
}
