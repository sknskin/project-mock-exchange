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
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './config/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('ApiGateway');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://cdn.simpleicons.org'],
        },
      },
    }),
  );
  app.use(cookieParser());

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

  app.useGlobalFilters(new AllExceptionsFilter());
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

  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api-docs`);
}

bootstrap();
