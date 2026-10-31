import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { validationExceptionFactory } from './common/errors/validation-exception.factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.use(cookieParser());

  // ✅ Config
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;

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

  // ✅ Swagger AFTER everything is configured
  const config = new DocumentBuilder()
    .setTitle('NestJS Backend API')
    .setDescription('Reusable NestJS backend boilerplate API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
      },
      'access-token', // 👈 important
    )
    .addCookieAuth(
      'refresh_token',
      { type: 'apiKey', in: 'cookie' },
      'refresh-cookie',
    )
    .setExternalDoc('OpenAPI JSON', '/api-json')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.useLogger(app.get(Logger));

  await app.listen(port);
}
bootstrap();
