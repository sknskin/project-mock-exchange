/**
 * @file Notification 서비스 엔트리포인트
 * @description 알림 마이크로서비스를 시작합니다
 *
 * @file Notification Service Entry Point
 * @description Bootstraps the notification microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('NotificationService');

  const requiredEnvVars = ['REDIS_URL'];
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

  const port = process.env.NOTIFICATION_PORT || 3004;
  await app.listen(port);
  logger.log(`Notification Service running on port ${port}`);
}

bootstrap();
