/**
 * @file JWT 인증 가드
 * @description JWT 토큰을 검증하여 인증된 요청만 허용합니다
 *
 * @file JWT Auth Guard
 * @description Validates JWT tokens to allow only authenticated requests
 */
import { Injectable, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const result = await (super.canActivate(context) as Promise<boolean>);

    // httpOnly 쿠키로 인증된 경우 Authorization 헤더 복원 — 프록시 컨트롤러가 내부 서비스에 토큰 전달 가능하도록
    // Restore Authorization header from cookie token — allows proxy controllers to forward token to internal services
    if (result) {
      const request = context.switchToHttp().getRequest();
      if (!request.headers.authorization && request.cookies?.access_token) {
        request.headers.authorization = `Bearer ${request.cookies.access_token}`;
      }
    }

    return result;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isOptionalAuth) {
      return user || null;
    }
    return super.handleRequest(err, user, info, context);
  }
}
