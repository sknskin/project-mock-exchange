/**
 * @file TOTP 이중 인증 서비스
 * @description TOTP 기반 2FA 설정, 검증 기능을 제공합니다
 *
 * @file TOTP Two-Factor Authentication Service
 * @description Provides TOTP-based 2FA setup and verification
 */
import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

const TOTP_MAX_ATTEMPTS = 5;
const TOTP_LOCKOUT_SECONDS = 300; // 5 minutes

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.encryptionKey = createHash('sha256').update(secret).digest();
  }

  async setup(userId: string): Promise<{ secret: string; uri: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true, email: true },
    });

    if (!user) throw new BadRequestException('User not found');
    if (user.totpEnabled) throw new BadRequestException('TOTP already enabled');

    const totp = new OTPAuth.TOTP({
      issuer: 'VirtuEx',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const uri = totp.toString();

    // 임시 저장 (검증 후 활성화) / Store temporarily (activate after verification)
    const encrypted = this.encrypt(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: encrypted, totpEnabled: false },
    });

    this.logger.log(`TOTP setup initiated for user: ${userId.substring(0, 8)}...`);
    return { secret, uri };
  }

  async verify(userId: string, code: string): Promise<boolean> {
    // Brute force protection
    const attemptsKey = `totp:attempts:${userId}`;
    const attempts = await this.redis.get(attemptsKey);
    if (attempts && parseInt(attempts) >= TOTP_MAX_ATTEMPTS) {
      throw new ForbiddenException('Too many TOTP attempts. Try again in 5 minutes.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!user?.totpSecret) throw new BadRequestException('TOTP not configured');

    const secret = this.decrypt(user.totpSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'VirtuEx',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta !== null) {
      // Success: reset counter
      await this.redis.del(attemptsKey);
      return true;
    }

    // Failure: increment counter
    const newCount = await this.redis.incr(attemptsKey);
    if (newCount === 1) {
      await this.redis.expire(attemptsKey, TOTP_LOCKOUT_SECONDS);
    }
    this.logger.warn(`TOTP verification failed for user ${userId.substring(0, 8)}... (attempt ${newCount}/${TOTP_MAX_ATTEMPTS})`);
    return false;
  }

  async enable(userId: string, code: string): Promise<void> {
    const valid = await this.verify(userId, code);
    if (!valid) throw new BadRequestException('Invalid TOTP code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    });

    this.logger.log(`TOTP enabled for user: ${userId.substring(0, 8)}...`);
  }

  async disable(userId: string, code: string): Promise<void> {
    const valid = await this.verify(userId, code);
    if (!valid) throw new BadRequestException('Invalid TOTP code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
    });

    this.logger.log(`TOTP disabled for user: ${userId.substring(0, 8)}...`);
  }

  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    });
    return user?.totpEnabled ?? false;
  }

  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(data: string): string {
    const [ivHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
