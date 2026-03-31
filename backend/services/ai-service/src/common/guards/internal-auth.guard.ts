import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * SVC-L-01: INTERNAL_SERVICE_SECRET 순환 정책
 * - 최소 90일마다 비밀키를 교체합니다.
 * - 교체 시 모든 마이크로서비스(.env)를 동시에 업데이트한 후 롤링 재시작합니다.
 * - 이전 키와 신규 키를 동시에 허용하는 전환 기간(grace period)은 지원하지 않으므로,
 *   교체 시 다운타임 없이 진행하려면 Blue/Green 배포를 권장합니다.
 *
 * SVC-L-01: INTERNAL_SERVICE_SECRET rotation policy
 * - Rotate the secret at least every 90 days.
 * - Update all microservice .env files simultaneously, then perform a rolling restart.
 * - No grace period for old+new key coexistence is supported;
 *   Blue/Green deployment is recommended for zero-downtime rotation.
 */
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
