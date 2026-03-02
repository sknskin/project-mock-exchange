/**
 * @file Chat 서비스 엔트리포인트
 * @description 채팅 마이크로서비스를 시작합니다
 *
 * @file Chat Service Entry Point
 * @description Bootstraps the chat microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('ChatService');

  const requiredEnvVars = ['CHAT_DATABASE_URL'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);

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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-token', 'x-user-id'],
    maxAge: 86400,
  });

  const port = process.env.CHAT_PORT || 3005;
  await app.listen(port);
  logger.log(`Chat Service running on port ${port}`);
}

bootstrap();
