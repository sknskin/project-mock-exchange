/**
 * @file AI Service 엔트리포인트
 * @description AI 마이크로서비스를 시작합니다
 *
 * @file AI Service Entry Point
 * @description Bootstraps the AI microservice
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
  const logger = new Logger('AiService');

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    logger.error('Missing required environment variable: OPENAI_API_KEY or ANTHROPIC_API_KEY');
    process.exit(1);
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

  const port = process.env.AI_SERVICE_PORT || 3006;
  await app.listen(port);
  logger.log(`AI Service running on port ${port}`);
}

bootstrap();
