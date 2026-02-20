/**
 * @file Portfolio 서비스 엔트리포인트
 * @description 포트폴리오 마이크로서비스를 시작합니다
 *
 * @file Portfolio Service Entry Point
 * @description Bootstraps the portfolio microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

// BigInt → JSON 직렬화 지원 / Enable BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger('PortfolioService');
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

  const port = process.env.PORTFOLIO_PORT || 3003;
  await app.listen(port);
  logger.log(`Portfolio Service running on port ${port}`);
}

bootstrap();
