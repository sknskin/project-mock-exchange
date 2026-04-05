/**
 * @file CSRF 보호 가드
 * @description Double-submit cookie 패턴으로 CSRF 공격을 방지합니다
 *
 * @file CSRF Protection Guard
 * @description Prevents CSRF attacks using the double-submit cookie pattern
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

// CSRF 검증 건너뛰기 메타데이터 키 / Metadata key to skip CSRF validation
export const SKIP_CSRF_KEY = 'skipCsrf';

// CSRF 검증을 건너뛰는 데코레이터 — 로그인, 회원가입 등 인증 전 엔드포인트에 사용
// Decorator to skip CSRF validation — used on pre-auth endpoints like login, register
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

// CSRF 검증이 필요한 HTTP 메서드 — 상태 변경 요청만 검증
// HTTP methods requiring CSRF validation — only state-changing requests
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// CSRF 헤더 이름 / CSRF header name
const CSRF_HEADER_NAME = 'x-csrf-token';

// CSRF 쿠키 이름 / CSRF cookie name
const CSRF_COOKIE_NAME = 'csrf_token';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * CSRF 토큰 검증 — 쿠키의 csrf_token과 헤더의 X-CSRF-Token이 일치하는지 확인
   * Validate CSRF token — check that csrf_token cookie matches X-CSRF-Token header
   */
  canActivate(context: ExecutionContext): boolean {
    // @SkipCsrf() 데코레이터가 적용된 핸들러는 검증 건너뛰기
    // Skip validation for handlers decorated with @SkipCsrf()
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // GET, HEAD, OPTIONS 등 안전한 메서드는 검증 건너뛰기
    // Skip validation for safe methods (GET, HEAD, OPTIONS, etc.)
    if (!STATE_CHANGING_METHODS.includes(request.method.toUpperCase())) {
      return true;
    }

    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;

    // 쿠키 또는 헤더가 없으면 CSRF 검증 실패
    // Fail CSRF validation if cookie or header is missing
    if (!cookieToken || !headerToken) {
      this.logger.warn(
        `CSRF validation failed: missing ${!cookieToken ? 'cookie' : 'header'} (${request.method} ${request.url})`,
      );
      throw new ForbiddenException('CSRF token missing');
    }

    // 쿠키 토큰과 헤더 토큰 비교 — 불일치 시 CSRF 공격 가능성
    // Compare cookie token with header token — mismatch indicates potential CSRF attack
    if (cookieToken !== headerToken) {
      this.logger.warn(
        `CSRF validation failed: token mismatch (${request.method} ${request.url})`,
      );
      throw new ForbiddenException('CSRF token mismatch');
    }

    return true;
  }
}
