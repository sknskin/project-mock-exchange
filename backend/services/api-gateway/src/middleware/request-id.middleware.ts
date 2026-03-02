/**
 * @file Request ID 미들웨어
 * @description 모든 요청에 고유한 Request ID를 부여합니다 (추적 및 디버깅용)
 *
 * @file Request ID Middleware
 * @description Assigns a unique Request ID to every request for tracing and debugging
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
