/**
 * @file Market Data 서비스 엔트리포인트
 * @description 시장 데이터 마이크로서비스를 시작합니다
 *
 * @file Market Data Service Entry Point
 * @description Bootstraps the market data microservice
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AppModule } from './app.module';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';

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
  const logger = new Logger('MarketDataService');

  const requiredEnvVars = ['MARKET_DATA_DATABASE_URL'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new BigIntSerializerInterceptor());

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

  const port = process.env.MARKET_DATA_PORT || 3001;
  await app.listen(port);
  logger.log(`Market Data Service running on port ${port}`);
}

bootstrap();
