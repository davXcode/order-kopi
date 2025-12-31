/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
// import { AppModule } from 'src/app.module';
import { AppModule } from '../dist/app.module';

// import { AppModule } from '../../dist/app.module'; // ⬅️ FIX PATH
// import { AppModule } from '../../dist/app.module'; // ⬅️ FIX PATH

let cachedServer: any;

async function createServer() {
  const server = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.enableCors({
    origin: ['https://order-kopi.vercel.app', 'http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
  return server;
}

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    cachedServer = await createServer();
  }
  return cachedServer(req, res);
}
