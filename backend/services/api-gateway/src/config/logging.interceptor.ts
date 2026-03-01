/**
 * @file 요청/응답 로깅 인터셉터
 * @description API 요청 메서드, 경로, 상태 코드, 응답 시간을 로깅합니다
 *
 * @file Request/Response Logging Interceptor
 * @description Logs API request method, path, status code, and response time
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        const duration = Date.now() - start;
        this.logger.log(`${method} ${originalUrl} ${res.statusCode} ${duration}ms`);
      }),
    );
  }
}
