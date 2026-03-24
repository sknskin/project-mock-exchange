/**
 * @file JWT 전략
 * @description Passport JWT 전략으로 Bearer 토큰을 검증하고 페이로드를 추출합니다
 *
 * @file JWT Strategy
 * @description Passport JWT strategy that validates Bearer tokens and extracts payload
 */
import { Injectable, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, UserDto } from '@virtuex/common';
import Redis from 'ioredis';
import axios from 'axios';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly userAuthUrl: string;
  private readonly internalToken: string;

  constructor(
    configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super({
      // 쿠키에서 먼저 추출, 없으면 Authorization 헤더로 폴백 (Swagger/Postman 호환)
      // Extract from cookie first, fallback to Authorization header (Swagger/Postman compatibility)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: { cookies?: Record<string, string> }) => req?.cookies?.access_token || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
    this.userAuthUrl = `http://${configService.getOrThrow<string>('SERVICE_HOST')}:${configService.get('USER_AUTH_PORT', 3007)}`;
    this.internalToken = configService.get<string>('INTERNAL_SERVICE_SECRET', '');
  }

  async validate(payload: JwtPayload): Promise<UserDto> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Redis 캐시에서 유저 상태 확인 (60초 TTL)
    const cacheKey = `user:status:${payload.sub}`;
    let statusStr = await this.redis.get(cacheKey);

    if (!statusStr) {
      try {
        const res = await axios.get(
          `${this.userAuthUrl}/users/${payload.sub}/status`,
          {
            timeout: 5000,
            headers: { 'x-internal-token': this.internalToken },
          },
        );
        statusStr = JSON.stringify(res.data);
        // 캐시 성공 시 60초 TTL 저장 (Cache with 60s TTL on success)
        await this.redis.set(cacheKey, statusStr, 'EX', 60);
      } catch (error) {
        // user-auth 장애 시 Redis 캐시 폴백 — 캐시 히트 시 허용, 미스 시 거부
        // Fallback to Redis cache when user-auth is down — allow on cache hit, reject on miss
        this.logger.warn(`User-auth unavailable for ${payload.sub?.substring(0, 8)}..., attempting cache fallback`);
        statusStr = await this.redis.get(cacheKey);
        if (!statusStr) {
          this.logger.error(`User status check failed for ${payload.sub?.substring(0, 8)}... — no cache available, rejecting request`);
          throw new UnauthorizedException('User verification service unavailable. Please try again later.');
        }
        this.logger.log(`Using cached status for ${payload.sub?.substring(0, 8)}...`);
      }
    }

    const { isActive, approvalStatus } = JSON.parse(statusStr);
    if (!isActive || approvalStatus !== 'APPROVED') {
      throw new UnauthorizedException('Account is deactivated or not approved');
    }

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      name: payload.name || '',
      role: payload.role,
      isActive,
      approvalStatus,
      createdAt: '',
    };
  }
}
