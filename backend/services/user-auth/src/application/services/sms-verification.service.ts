/**
 * @file SMS 인증 서비스
 * @description Redis 기반 SMS 인증번호 발송 및 검증 로직을 처리합니다
 *
 * @file SMS Verification Service
 * @description Handles SMS verification code sending and validation using Redis
 */
import { Injectable, Logger, Inject, BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

@Injectable()
export class SmsVerificationService {
  private readonly logger = new Logger(SmsVerificationService.name);
  private readonly CODE_TTL: number;
  private readonly VERIFIED_TTL = 600; // 10분 / 10 minutes
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.CODE_TTL = this.configService.get<number>('SMS_CODE_TTL', 180);
  }

  async sendVerificationCode(phone: string): Promise<void> {
    const code = randomInt(100000, 999999).toString();
    const key = `sms:verify:${phone}`;

    await this.redis.set(key, code, 'EX', this.CODE_TTL);
    await this.redis.del(`sms:attempts:${phone}`);

    // 모의: 실제 SMS 대신 콘솔에 인증코드 출력 / Mock: log code to console instead of sending real SMS
    if (process.env.NODE_ENV === 'production') {
      this.logger.log(`[MOCK SMS] Verification code sent to ${phone}: ****${code.slice(-2)}`);
    } else {
      this.logger.log(`[MOCK SMS] Verification code for ${phone}: ${code}`);
    }
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const attemptsKey = `sms:attempts:${phone}`;
    const attempts = await this.redis.get(attemptsKey);

    if (attempts && parseInt(attempts) >= this.MAX_ATTEMPTS) {
      throw new HttpException('Too many verification attempts. Please request a new code.', 429);
    }

    const key = `sms:verify:${phone}`;
    const stored = await this.redis.get(key);

    if (!stored) {
      throw new BadRequestException('Verification code expired or not found');
    }

    if (stored !== code) {
      await this.redis.incr(attemptsKey);
      await this.redis.expire(attemptsKey, this.CODE_TTL);
      throw new BadRequestException('Invalid verification code');
    }

    // 전화번호 인증 완료 처리 / Mark phone as verified
    await this.redis.del(key);
    await this.redis.del(attemptsKey);
    await this.redis.set(`sms:verified:${phone}`, '1', 'EX', this.VERIFIED_TTL);

    this.logger.log(`Phone verified: ${phone}`);
    return true;
  }

  async isPhoneVerified(phone: string): Promise<boolean> {
    const result = await this.redis.get(`sms:verified:${phone}`);
    return result === '1';
  }
}
