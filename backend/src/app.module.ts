import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/order.entity';

import { SettingsModule } from './settings/settings.module';
import { Setting } from './settings/setting.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Order, Setting],
      synchronize: true, // dev only
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined,
    }),
    OrdersModule,
    SettingsModule,
  ],
})
export class AppModule {}
