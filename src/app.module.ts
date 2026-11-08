import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule, Params } from 'nestjs-pino';
import { IncomingMessage, ServerResponse } from 'http';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

import { AppThrottlerGuard } from '@/common/throttler/app-throttler.guard';
import { createThrottlerOptions } from '@/common/throttler/throttler.config';
import { PrismaModule } from '@/common/prisma/prisma.module';
import appConfig from './config/app.config';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { validateEnv } from './config/env.validation';
import { BullmqModule } from '@/common/bullmq/bullmq.module';

import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';
import { OrganizationModule } from '@/modules/organization/organization.module';
import { OrganizationRoleModule } from '@/modules/organization-role/organization-role.module';
import { TankModule } from '@/modules/tank/tank.module';
import { HealthModule } from '@/modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createThrottlerOptions(configService.getOrThrow<string>('JWT_SECRET')),
    }),

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

    PrismaModule,
    HealthModule,
    BullmqModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    OrganizationRoleModule,
    TankModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
