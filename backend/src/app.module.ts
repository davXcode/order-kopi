import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/order.entity';

import { SettingsModule } from './settings/settings.module';
import { Setting } from './settings/setting.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [Order, Setting],
      synchronize: true, // dev only
    }),
    OrdersModule,
    SettingsModule,
  ],
})
export class AppModule {}
