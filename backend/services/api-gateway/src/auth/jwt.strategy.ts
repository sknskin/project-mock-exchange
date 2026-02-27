/**
 * @file JWT 전략
 * @description Passport JWT 전략으로 Bearer 토큰을 검증하고 페이로드를 추출합니다
 *
 * @file JWT Strategy
 * @description Passport JWT strategy that validates Bearer tokens and extracts payload
 */
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, UserDto } from '@virtuex/common';
import Redis from 'ioredis';
import axios from 'axios';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly userAuthUrl: string;

  constructor(
    configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
    this.userAuthUrl = `http://localhost:${configService.get('USER_AUTH_PORT', 3007)}`;
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
          { timeout: 5000 },
        );
        statusStr = JSON.stringify(res.data);
        await this.redis.set(cacheKey, statusStr, 'EX', 60);
      } catch {
        // user-auth 서비스 장애 시 요청 거부 (안전 우선)
        throw new UnauthorizedException('Unable to verify user status');
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
