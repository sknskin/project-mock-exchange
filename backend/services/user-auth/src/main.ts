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

  // CFG-L-01: ENCRYPTION_KEY 미설정 시 경고 로그 — JWT_SECRET 대체 사용은 권장하지 않음
  // CFG-L-01: Warn if ENCRYPTION_KEY is not set — falling back to JWT_SECRET is not recommended
  if (!process.env.ENCRYPTION_KEY) {
    logger.warn(
      'ENCRYPTION_KEY is not set — falling back to JWT_SECRET for RRN encryption. ' +
      'Set a dedicated ENCRYPTION_KEY in production for better security isolation.',
    );
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

  // INT-L-01: 내부 전용 서비스 — CORS 비활성화 (API Gateway만 접근)
  // 프로덕션 환경에서는 이 서비스를 내부 네트워크(private subnet)에만 바인딩해야 합니다.
  // 예: app.listen(port, '10.0.0.0') 또는 Docker/Kubernetes 네트워크 정책으로 외부 접근을 차단합니다.
  //
  // INT-L-01: Internal-only service — CORS disabled (access through API Gateway only)
  // In production, bind this service to internal network only (private subnet).
  // e.g., app.listen(port, '10.0.0.0') or use Docker/Kubernetes network policies to block external access.

  const port = process.env.USER_AUTH_PORT || 3007;
  await app.listen(port);
  logger.log(`User Auth Service running on port ${port}`);
}

bootstrap();
