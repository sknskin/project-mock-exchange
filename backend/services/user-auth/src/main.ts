/**
 * @file User Auth 서비스 엔트리포인트
 * @description 사용자 인증 마이크로서비스를 시작합니다
 *
 * @file User Auth Service Entry Point
 * @description Bootstraps the user authentication microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') return;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.message : 'Internal server error';
    if (!(exception instanceof HttpException)) {
      this.logger.error(`Unhandled: ${exception instanceof Error ? exception.message : exception}`, exception instanceof Error ? exception.stack : undefined);
    }
    response.status(status).json({ success: false, statusCode: status, message, timestamp: new Date().toISOString() });
  }
}

async function bootstrap() {
  const logger = new Logger('UserAuthService');

  // 필수 환경변수 검증 / Validate required environment variables
  const required = ['JWT_SECRET', 'INTERNAL_SERVICE_SECRET', 'USER_AUTH_DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  // Increase body size limit for base64 file uploads (default ~100KB)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });
  app.use(cookieParser());

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 내부 전용 서비스 — CORS 비활성화 (API Gateway만 접근)
  // Internal-only service — CORS disabled (access through API Gateway only)

  const port = process.env.USER_AUTH_PORT || 3007;
  await app.listen(port);
  logger.log(`User Auth Service running on port ${port}`);
}

bootstrap();
