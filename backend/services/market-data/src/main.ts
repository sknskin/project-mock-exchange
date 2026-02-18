/**
 * @file Market Data 서비스 엔트리포인트
 * @description 시장 데이터 마이크로서비스를 시작합니다
 *
 * @file Market Data Service Entry Point
 * @description Bootstraps the market data microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('MarketDataService');
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

  const port = process.env.MARKET_DATA_PORT || 3001;
  await app.listen(port);
  logger.log(`Market Data Service running on port ${port}`);
}

bootstrap();
