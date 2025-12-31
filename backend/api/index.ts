import 'reflect-metadata';
import express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';

let cachedServer: any;

async function createServer() {
  console.log('BOOT: createServer()');

  const server = express();
  console.log('BOOT: express created');

  console.log(
    'ENV DATABASE_URL =',
    process.env.DATABASE_URL ? 'OK' : 'MISSING',
  );
  console.log(
    'ENV CLOUDINARY =',
    process.env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'MISSING',
  );

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  console.log('BOOT: NestFactory.create OK');

  app.enableCors({
    origin: ['https://order-kopi.vercel.app'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();
  console.log('BOOT: app.init OK');

  return server;
}

export default async function handler(req: any, res: any) {
  try {
    if (!cachedServer) {
      cachedServer = await createServer();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return cachedServer(req, res);
  } catch (err) {
    console.error('FATAL ERROR:', err);
    throw err;
  }
}
