import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { OrdersModule } from './orders/orders.module';
// import { Order } from './orders/order.entity';

import { SettingsModule } from './settings/settings.module';
// import { Setting } from './settings/setting.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // TypeOrmModule.forRoot({
    //   type: 'postgres',
    //   url: process.env.DATABASE_URL,
    //   entities: [Order, Setting],
    //   synchronize: true, // dev only
    //   ssl:
    //     process.env.NODE_ENV === 'production'
    //       ? { rejectUnauthorized: false }
    //       : undefined,
    // }),
    // TypeOrmModule.forRoot({
    //   type: 'postgres',
    //   url: process.env.DATABASE_URL,
    //   ssl: { rejectUnauthorized: false },
    //   autoLoadEntities: true,
    //   synchronize: true, // aman untuk project kecil
    // }),
    // TypeOrmModule.forRoot({
    //   type: 'postgres',
    //   url: process.env.DATABASE_URL,
    //   autoLoadEntities: true,
    //   entities: [Order, Setting],
    //   synchronize: true, // kalau production serius, mending pakai migrations
    //   ssl:
    //     process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    //   extra:
    //     process.env.DB_PGBOUNCER === 'true'
    //       ? { max: 1 } // penting di serverless biar gak meledak koneksi
    //       : undefined,
    // }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true, // ok untuk project kecil, kalau production serius pakai migrations

      // penting untuk supabase (ssl)
      ssl: { rejectUnauthorized: false },

      // WAJIB: supaya pg benar2 pakai ssl config ini (ngilangin "self-signed certificate")
      extra: {
        ssl: { rejectUnauthorized: false },

        // penting untuk serverless + pgbouncer biar koneksi gak meledak
        max: 1,
      },
    }),

    OrdersModule,
    SettingsModule,
  ],
})
export class AppModule {}
