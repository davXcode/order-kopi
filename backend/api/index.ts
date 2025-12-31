import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';

let cachedServer: express.Express | null = null;

async function createServer() {
  const server = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.enableCors({
    origin: true, // boleh semua dulu; kalau mau strict, isi domain frontend kamu
    credentials: true,
  });

  await app.init();
  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!cachedServer) cachedServer = await createServer();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cachedServer(req as any, res as any);
  } catch (err) {
    console.error(err);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return res.status(500).json({ message: 'Server error' });
  }
}
