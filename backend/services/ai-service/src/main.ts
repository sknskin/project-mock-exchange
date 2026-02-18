/**
 * @file AI Service 엔트리포인트
 * @description AI 마이크로서비스를 시작합니다
 *
 * @file AI Service Entry Point
 * @description Bootstraps the AI microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AiService');
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
  });

  const port = process.env.AI_SERVICE_PORT || 3006;
  await app.listen(port);
  logger.log(`AI Service running on port ${port}`);
}

bootstrap();
