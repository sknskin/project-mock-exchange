/**
 * @file Order Engine 서비스 엔트리포인트
 * @description 주문 매칭 엔진 마이크로서비스를 시작합니다
 *
 * @file Order Engine Service Entry Point
 * @description Bootstraps the order matching engine microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';

async function bootstrap() {
  const logger = new Logger('OrderEngineService');

  const requiredEnvVars = ['ORDER_ENGINE_DATABASE_URL'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new BigIntSerializerInterceptor());

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

  const port = process.env.ORDER_ENGINE_PORT || 3002;
  await app.listen(port);
  logger.log(`Order Engine Service running on port ${port}`);
}

bootstrap();
