/**
 * @file API Gateway 엔트리포인트
 * @description Swagger 문서, CORS, Helmet CSP 등을 설정하고 서버를 시작합니다
 *
 * @file API Gateway Entry Point
 * @description Configures Swagger docs, CORS, Helmet CSP and starts the server
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './config/all-exceptions.filter';
import { LoggingInterceptor } from './config/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('ApiGateway');

  // 필수 환경변수 검증 / Validate required environment variables
  const required = ['JWT_SECRET', 'INTERNAL_SERVICE_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });
  // Gzip/Deflate 응답 압축 — 대역폭 30-50% 절감 / Response compression — reduces bandwidth 30-50%
  app.use(compression({ threshold: 4096 }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://cdn.simpleicons.org'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'https://api.frankfurter.app'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );
  app.use(cookieParser());

  // Swagger 문서는 프로덕션 환경에서 비활성화
  // Swagger docs disabled in production
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('VirtuEx API')
      .setDescription('실시간 모의 주식/암호화폐 거래 플랫폼 API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addTag('Auth', '인증 관련 API')
      .addTag('Market', '시장 데이터 API')
      .addTag('Orders', '주문 관련 API')
      .addTag('Portfolio', '포트폴리오 API')
      .addTag('Admin', '관리자 API')
      .addTag('Announcements', '공지사항 API')
      .addTag('Chat', '채팅 API')
      .addTag('Notifications', '알림 API')
      .addTag('News', '뉴스 API')
      .addTag('Price Alerts', '가격 알림 API')
      .addTag('Profile', '프로필 API')
      .addTag('Statistics', '통계 API')
      .addTag('Health', '헬스 체크 API')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
  }

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
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

  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api-docs`);
}

bootstrap();
