import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';

import { validateEnv } from './common/config/env.validation';
import { createWinstonOptions } from './common/logger/winston.config';
import { PrismaModule } from './common/prisma/prisma.module';

import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MenuModule } from './modules/menu/menu.module';
import { PosModule } from './modules/pos/pos.module';
import { CrmModule } from './modules/crm/crm.module';
import { QrModule } from './modules/qr/qr.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
    }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        createWinstonOptions(
          (cfg.get<'development' | 'production' | 'test'>('NODE_ENV') ?? 'development'),
          cfg.get<string>('LOG_LEVEL') ?? 'info',
        ),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        {
          name: 'default',
          ttl: Number(cfg.get('THROTTLE_TTL') ?? 60) * 1000,
          limit: Number(cfg.get('THROTTLE_LIMIT') ?? 100),
        },
      ],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: {
          host: cfg.get<string>('REDIS_HOST') ?? 'localhost',
          port: Number(cfg.get('REDIS_PORT') ?? 6379),
          password: cfg.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    PrismaModule,

    // Módulos del dominio
    HealthModule,
    AuthModule,
    MenuModule,
    PosModule,
    CrmModule,
    QrModule,
    PromotionsModule,
    WhatsAppModule,
    AdminModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
