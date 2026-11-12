import 'tsconfig-paths/register';
import './config/load-env';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { setupSwagger } from './swagger';
import cookieParser from 'cookie-parser';
import { validationExceptionFactory } from './common/errors/validation-exception.factory';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.use(cookieParser());

  // ✅ Config
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  app.disable('x-powered-by');
  app.set('trust proxy', configService.get<number>('trustProxy') ?? 0);

  // ✅ Enable CORS (ADD THIS 👇)
  app.enableCors({
    origin: configService.get<string[]>('corsOrigins') ?? [],
    credentials: true,
    exposedHeaders: ['Retry-After'],
  });

  // ✅ Global setup first
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ✅ Swagger AFTER everything is configured (off in production by default)
  if (configService.get<boolean>('swaggerEnabled')) {
    setupSwagger(app);
  }

  app.useLogger(app.get(Logger));

  await app.listen(port);
}
bootstrap();
