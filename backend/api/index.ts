/* eslint-disable @typescript-eslint/no-unsafe-call */
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';

let cachedServer: any;

async function bootstrap() {
  const server = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bufferLogs: true,
  });

  app.enableCors({
    origin: ['http://localhost:5173', 'https://order-kopi.vercel.app'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();
  return server;
}

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return cachedServer(req, res);
}
