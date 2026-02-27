/**
 * @file 글로벌 예외 필터
 * @description 모든 예외를 통일된 형식으로 응답하고, 스택 트레이스를 제거합니다
 *
 * @file Global Exception Filter
 * @description Catches all exceptions, returns a uniform error response, strips stack traces
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // WebSocket 컨텍스트는 무시 / Skip non-HTTP contexts (WebSocket)
    if (host.getType() !== 'http') return;

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Too many requests. Please try again later.';
      error = 'Too Many Requests';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = Array.isArray(obj.message)
          ? obj.message.join(', ')
          : (obj.message as string) || exception.message;
      } else {
        message = exception.message;
      }
      error = HttpStatus[status] || 'Error';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
