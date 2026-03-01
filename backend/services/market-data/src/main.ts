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

// BigInt → JSON 직렬화 지원 / Enable BigInt JSON serialization
// 안전 정수 범위 초과 시 문자열 반환 / Return string if outside safe integer range
(BigInt.prototype as any).toJSON = function () {
  const n = Number(this);
  return Number.isSafeInteger(n) ? n : this.toString();
};

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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-token', 'x-user-id'],
    maxAge: 86400,
  });

  const port = process.env.MARKET_DATA_PORT || 3001;
  await app.listen(port);
  logger.log(`Market Data Service running on port ${port}`);
}

bootstrap();
