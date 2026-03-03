/**
 * @file Notification 서비스 엔트리포인트
 * @description 알림 마이크로서비스를 시작합니다
 *
 * @file Notification Service Entry Point
 * @description Bootstraps the notification microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
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
  const logger = new Logger('NotificationService');

  const requiredEnvVars = ['REDIS_URL'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);

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

  const port = process.env.NOTIFICATION_PORT || 3004;
  await app.listen(port);
  logger.log(`Notification Service running on port ${port}`);
}

bootstrap();
