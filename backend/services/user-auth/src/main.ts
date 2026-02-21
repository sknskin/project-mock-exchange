/**
 * @file User Auth 서비스 엔트리포인트
 * @description 사용자 인증 마이크로서비스를 시작합니다
 *
 * @file User Auth Service Entry Point
 * @description Bootstraps the user authentication microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('UserAuthService');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  // Increase body size limit for base64 file uploads (default ~100KB)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
    credentials: true,
  });

  const port = process.env.USER_AUTH_PORT || 3007;
  await app.listen(port);
  logger.log(`User Auth Service running on port ${port}`);
}

bootstrap();
