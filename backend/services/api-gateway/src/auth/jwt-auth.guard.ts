/**
 * @file JWT 인증 가드
 * @description JWT 토큰을 검증하여 인증된 요청만 허용합니다
 *
 * @file JWT Auth Guard
 * @description Validates JWT tokens to allow only authenticated requests
 */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Optional JWT Auth Guard
 * Attempts to authenticate but does not reject unauthenticated requests.
 * If a valid token is present, req.user is populated; otherwise req.user is undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
