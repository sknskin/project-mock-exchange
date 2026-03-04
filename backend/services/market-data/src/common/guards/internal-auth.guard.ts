/**
 * @file 내부 서비스 인증 가드
 * @description 마이크로서비스 간 통신을 보호하는 인증 가드.
 *              x-internal-token 헤더와 INTERNAL_SERVICE_SECRET 환경변수를
 *              timingSafeEqual로 비교하여 타이밍 공격을 방지합니다.
 *
 * @file Internal Service Auth Guard
 * @description Guard protecting inter-microservice communication.
 *              Compares x-internal-token header against INTERNAL_SERVICE_SECRET
 *              using timingSafeEqual to prevent timing attacks.
 */
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-internal-token'];
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Internal service secret not configured');
    }
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Invalid internal service token');
    }
    try {
      const tokenBuf = Buffer.from(token);
      const secretBuf = Buffer.from(secret);
      // 길이 비교를 먼저 수행 — timingSafeEqual은 길이가 다르면 예외를 던짐
      // Check length first — timingSafeEqual throws on different lengths
      if (tokenBuf.length !== secretBuf.length || !timingSafeEqual(tokenBuf, secretBuf)) {
        throw new UnauthorizedException('Invalid internal service token');
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid internal service token');
    }
    return true;
  }
}
