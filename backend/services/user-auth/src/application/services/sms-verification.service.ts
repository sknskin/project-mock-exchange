/**
 * @file SMS 인증 서비스
 * @description Redis 기반 SMS 인증번호 발송 및 검증 로직을 처리합니다
 *
 * @file SMS Verification Service
 * @description Handles SMS verification code sending and validation using Redis
 */
import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

@Injectable()
export class SmsVerificationService {
  private readonly logger = new Logger(SmsVerificationService.name);
  private readonly CODE_TTL = 180; // 3 minutes
  private readonly VERIFIED_TTL = 600; // 10 minutes

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async sendVerificationCode(phone: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `sms:verify:${phone}`;

    await this.redis.set(key, code, 'EX', this.CODE_TTL);

    // Mock: log code to console instead of sending real SMS
    this.logger.log(`[MOCK SMS] Verification code for ${phone}: ${code}`);
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const key = `sms:verify:${phone}`;
    const stored = await this.redis.get(key);

    if (!stored) {
      throw new BadRequestException('Verification code expired or not found');
    }

    if (stored !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    // Mark phone as verified
    await this.redis.del(key);
    await this.redis.set(`sms:verified:${phone}`, '1', 'EX', this.VERIFIED_TTL);

    this.logger.log(`Phone verified: ${phone}`);
    return true;
  }

  async isPhoneVerified(phone: string): Promise<boolean> {
    const result = await this.redis.get(`sms:verified:${phone}`);
    return result === '1';
  }
}
