import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule, Params } from 'nestjs-pino';
import { IncomingMessage, ServerResponse } from 'http';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import appConfig from './config/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnv } from './config/env.validation';
import { BullmqModule } from '@/common/bullmq/bullmq.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 সেকেন্ড (milliseconds-এ)
        limit: 100, // এই সময়ে সর্বোচ্চ 100টা request per IP
      },
    ]),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Params => ({
        pinoHttp: {
          level: configService.get<string>('LOG_LEVEL') || 'info',

          transport:
            configService.get<string>('NODE_ENV') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                    singleLine: true,
                  },
                }
              : undefined,

          autoLogging: true,

          serializers: {
            req(req: IncomingMessage) {
              return {
                method: req.method,
                url: req.url,
              };
            },
            res(res: ServerResponse) {
              return {
                statusCode: res.statusCode,
              };
            },
          },
          customSuccessMessage: (req, res) => {
            return `${req.method} ${req.url} ${res.statusCode}`;
          },
        },
      }),
    }),
    ScheduleModule.forRoot(),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),

    AuthModule,
    UserModule,
    PrismaModule,
    HealthModule,
    BullmqModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
