import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import { AppModule } from './app.module';
import { configurarApp } from './bootstrap';

const expressApp = express();
let nestPronto: Promise<NestExpressApplication> | null = null;

function garantirNest(): Promise<NestExpressApplication> {
  if (!nestPronto) {
    nestPronto = (async () => {
      const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(expressApp),
      );
      await configurarApp(app);
      await app.init();
      return app;
    })();
  }
  return nestPronto;
}

async function bootstrapLocal(): Promise<void> {
  const app = await garantirNest();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

if (!process.env.VERCEL) {
  void bootstrapLocal();
}

// Vercel: exporta handler que espera o Nest inicializar.
export default async function handler(req: Request, res: Response): Promise<void> {
  await garantirNest();
  expressApp(req, res);
}
