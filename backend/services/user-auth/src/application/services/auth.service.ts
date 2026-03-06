/**
 * @file 인증 서비스
 * @description 회원가입, 로그인, 토큰 갱신, 로그아웃 비즈니스 로직을 처리합니다
 *
 * @file Auth Service
 * @description Handles registration, login, token refresh, and logout business logic
 */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { JwtPayload, AuthTokensDto, UserDto, USER_ROLE } from '@virtuex/common';
import Redis from 'ioredis';
import {
  USER_REPOSITORY,
  IUserRepository,
} from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { ResidentNumber } from '../../domain/value-objects/resident-number.vo';
import { SmsVerificationService } from './sms-verification.service';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS: number;
  private readonly LOGIN_SESSION_TTL: number;
  private readonly LOGIN_MAX_ATTEMPTS: number;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly smsVerificationService: SmsVerificationService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.SALT_ROUNDS = this.configService.get<number>('SALT_ROUNDS', 12);
    this.LOGIN_SESSION_TTL = this.configService.get<number>('LOGIN_SESSION_TTL', 180);
    this.LOGIN_MAX_ATTEMPTS = this.configService.get<number>('LOGIN_MAX_ATTEMPTS', 5);
  }

  async register(params: {
    email: string;
    username: string;
    password: string;
    passwordConfirm: string;
    name: string;
    phone: string;
    residentNumber: string;
    address: string;
    addressDetail: string;
    zipCode: string;
  }): Promise<UserDto> {
    const { email, username, password, passwordConfirm, name, phone, residentNumber, address, addressDetail, zipCode } = params;

    if (password !== passwordConfirm) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    const phoneVerified = await this.smsVerificationService.isPhoneVerified(phone);
    if (!phoneVerified) {
      throw new BadRequestException('전화번호 인증이 완료되지 않았습니다.');
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('이미 사용 중인 사용자명입니다.');
    }

    const existingPhone = await this.userRepository.findByPhone(phone);
    if (existingPhone) {
      throw new ConflictException('이미 등록된 전화번호입니다.');
    }

    // 주민등록번호 암호화 / Encrypt resident number
    const rrn = ResidentNumber.from(residentNumber);
    const rrnValidation = rrn.validate();
    if (!rrnValidation.valid) {
      throw new BadRequestException(`Invalid resident number: ${rrnValidation.message}`);
    }

    const rrnSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const encryptionSalt = this.configService.getOrThrow<string>('ENCRYPTION_SALT');
    const encryptedRrn = rrn.encrypt(rrnSecret, encryptionSalt);

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    const user = UserEntity.create({
      id: '',
      email,
      username,
      passwordHash,
      name,
      phone,
      encryptedRrn,
      address,
      addressDetail,
      zipCode,
    });

    const created = await this.userRepository.create(user);
    this.logger.log(`User registered: ${created.email}`);

    // 새 회원가입에 대해 SYSTEM/ADMIN 사용자에게 알림 (Notify SYSTEM/ADMIN users about new registration)
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['SYSTEM', 'ADMIN'] }, isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: 'REGISTRATION_REQUEST' as const,
          title: '새 회원가입 요청',
          message: `${created.username} (${created.email})님이 회원가입을 요청했습니다.`,
          link: `/admin/users/${created.id}`,
        })),
      }).catch((err) => {
        this.logger.error(`Failed to send admin notifications for new registration: ${err.message}`);
      });
    }

    return this.toUserDto(created);
  }

  async login(
    identifier: string,
    password: string,
  ): Promise<{ requireSmsVerification: true; sessionId: string; maskedPhone: string }> {
    let user = await this.userRepository.findByEmail(identifier);
    if (!user) {
      user = await this.userRepository.findByUsername(identifier);
    }
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 계정 잠금 확인 / Check account lock
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { lockedAt: true },
    });
    if (dbUser?.lockedAt) {
      throw new UnauthorizedException('계정이 잠금 처리되었습니다.');
    }

    // 미승인/반려 회원 로그인 거부 (SYSTEM 계정 예외) / Deny unapproved/rejected users (except SYSTEM)
    if (user.approvalStatus !== 'APPROVED' && user.role !== USER_ROLE.SYSTEM) {
      if (user.approvalStatus === 'REJECTED') {
        throw new UnauthorizedException('가입이 반려된 계정입니다.');
      }
      throw new UnauthorizedException('승인 대기 중인 계정입니다. 관리자 승인 후 로그인할 수 있습니다.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      this.logger.warn(`Login failed (invalid password) for: ${user.email}`);
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 로그인 세션 생성 + SMS 인증 발송 / Create login session + send SMS verification
    const sessionId = randomBytes(20).toString('hex');
    const sessionKey = `login:session:${sessionId}`;
    await this.redis.set(
      sessionKey,
      JSON.stringify({ userId: user.id, phone: user.phone, attemptsLeft: this.LOGIN_MAX_ATTEMPTS }),
      'EX',
      this.LOGIN_SESSION_TTL,
    );

    await this.smsVerificationService.sendVerificationCode(user.phone);

    const maskedPhone = this.maskPhone(user.phone);
    this.logger.log(`Login SMS verification requested for: ${user.email}`);

    return { requireSmsVerification: true, sessionId, maskedPhone };
  }

  /**
   * 로그인 SMS 인증번호 재전송
   * Redis에 저장된 로그인 세션을 조회하여 동일한 전화번호로 새 인증번호를 발송합니다.
   * 세션 TTL을 갱신하여 만료 시간을 연장합니다.
   *
   * Resend login SMS verification code.
   * Retrieves the login session from Redis and sends a new code to the same phone number.
   * Renews session TTL to extend the expiry time.
   *
   * @param sessionId - Redis에 저장된 로그인 세션 ID / Login session ID stored in Redis
   * @returns 마스킹된 전화번호 / Masked phone number
   * @throws UnauthorizedException 세션이 만료된 경우 / If session has expired
   */
  async resendLoginSms(sessionId: string): Promise<{ maskedPhone: string }> {
    const sessionKey = `login:session:${sessionId}`;
    const raw = await this.redis.get(sessionKey);
    if (!raw) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    const session = JSON.parse(raw) as { userId: string; phone: string; attemptsLeft: number };
    await this.smsVerificationService.sendVerificationCode(session.phone);

    // 세션 TTL 갱신 — 재전송 시 만료 시간 연장 / Renew session TTL — extend expiry on resend
    await this.redis.expire(sessionKey, this.LOGIN_SESSION_TTL);

    const maskedPhone = this.maskPhone(session.phone);
    this.logger.log(`Login SMS resent for session: ${sessionId}`);
    return { maskedPhone };
  }

  async verifyLoginSms(
    sessionId: string,
    code: string,
  ): Promise<
    | { success: true; user: UserDto; tokens: AuthTokensDto; refreshToken: string }
    | { success: false; attemptsLeft: number; message: string }
  > {
    const sessionKey = `login:session:${sessionId}`;
    const raw = await this.redis.get(sessionKey);
    if (!raw) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    const session = JSON.parse(raw) as { userId: string; phone: string; attemptsLeft: number };

    if (session.attemptsLeft <= 0) {
      await this.lockUser(session.userId, 'SMS verification attempts exceeded');
      await this.redis.del(sessionKey);
      throw new UnauthorizedException('계정이 잠금 처리되었습니다.');
    }

    // SMS 코드 검증 / Verify SMS code
    const smsKey = `sms:verify:${session.phone}`;
    const storedCode = await this.redis.get(smsKey);

    if (!storedCode || storedCode !== code) {
      const newAttemptsLeft = session.attemptsLeft - 1;

      if (newAttemptsLeft <= 0) {
        await this.lockUser(session.userId, 'SMS verification attempts exceeded');
        await this.redis.del(sessionKey);
        await this.redis.del(smsKey);
        return { success: false, attemptsLeft: 0, message: '인증 실패 횟수 초과로 계정이 잠겼습니다.' };
      }

      await this.redis.set(
        sessionKey,
        JSON.stringify({ ...session, attemptsLeft: newAttemptsLeft }),
        'EX',
        await this.redis.ttl(sessionKey),
      );

      return { success: false, attemptsLeft: newAttemptsLeft, message: '인증번호가 일치하지 않습니다.' };
    }

    // 인증 성공: 세션 및 SMS 키 삭제, 토큰 발급 / Verification success: clean up, issue tokens
    await this.redis.del(sessionKey);
    await this.redis.del(smsKey);

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const tokens = await this.generateTokens(user);
    const refreshToken = await this.createRefreshToken(user.id);

    // 통계를 위한 로그인 기록 (Log login for statistics)
    await this.prisma.loginLog.create({ data: { userId: user.id } }).catch((e) => this.logger.warn('LoginLog creation failed', e.message));

    this.logger.log(`User logged in (2FA verified): ${user.email}`);

    return { success: true, user: this.toUserDto(user), tokens, refreshToken };
  }

  private async lockUser(userId: string, reason: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lockedAt: new Date(), lockedReason: reason },
    });
    this.logger.warn(`Account locked: ${userId} - ${reason}`);
  }

  private maskPhone(phone: string): string {
    if (phone.length < 8) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  async refreshTokens(
    oldRefreshToken: string,
  ): Promise<{ tokens: AuthTokensDto; refreshToken: string }> {
    const tokenHash = this.hashToken(oldRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }

    // 리프레시 토큰 갱신 / Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = new UserEntity(
      stored.user.id,
      stored.user.email,
      stored.user.username,
      stored.user.passwordHash,
      stored.user.name,
      stored.user.role as JwtPayload['role'],
      stored.user.isActive,
      stored.user.approvalStatus,
      stored.user.approvedAt,
      stored.user.approvedBy,
      stored.user.approvalNote,
      stored.user.rejectedAt ?? null,
      stored.user.rejectedBy ?? null,
      stored.user.rejectionNote ?? null,
      stored.user.createdAt,
      stored.user.updatedAt,
      stored.user.phone,
      stored.user.encryptedRrn,
      stored.user.address,
      stored.user.addressDetail,
      stored.user.zipCode,
    );

    const tokens = await this.generateTokens(user);
    const refreshToken = await this.createRefreshToken(user.id);

    return { tokens, refreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async validateUser(payload: JwtPayload): Promise<UserDto | null> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) return null;
    return this.toUserDto(user);
  }

  private async generateTokens(user: UserEntity): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    const expiresIn = this.configService.get('JWT_ACCESS_EXPIRY', '15m');
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      accessToken,
      expiresIn: this.parseExpiry(expiresIn),
    };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRY', '7d');
    const expiresAt = new Date(Date.now() + this.parseExpiry(expiresIn) * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 기본값 15분 (default 15min)
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }

  /**
   * 비밀번호 찾기 SMS 인증번호 재전송
   * Redis에 저장된 비밀번호 재설정 세션을 조회하여 동일한 전화번호로 새 인증번호를 발송합니다.
   * 세션 TTL을 갱신하여 만료 시간을 연장합니다.
   *
   * Resend forgot-password SMS verification code.
   * Retrieves the password reset session from Redis and sends a new code to the same phone number.
   * Renews session TTL to extend the expiry time.
   *
   * @param sessionId - Redis에 저장된 비밀번호 재설정 세션 ID / Password reset session ID stored in Redis
   * @returns 마스킹된 전화번호 / Masked phone number
   * @throws UnauthorizedException 세션이 만료된 경우 / If session has expired
   */
  async resendPasswordResetSms(sessionId: string): Promise<{ maskedPhone: string }> {
    const sessionKey = `reset:session:${sessionId}`;
    const raw = await this.redis.get(sessionKey);
    if (!raw) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    const session = JSON.parse(raw) as { userId: string; phone: string; attemptsLeft: number; verified: boolean };
    await this.smsVerificationService.sendVerificationCode(session.phone);
    // 세션 TTL 갱신 — 재전송 시 만료 시간 연장 / Renew session TTL — extend expiry on resend
    await this.redis.expire(sessionKey, this.LOGIN_SESSION_TTL);

    const maskedPhone = this.maskPhone(session.phone);
    this.logger.log(`Password reset SMS resent for session: ${sessionId}`);
    return { maskedPhone };
  }

  // ── 비밀번호 재설정 (Password Reset) ──

  async requestPasswordReset(identifier: string): Promise<{ sessionId: string; maskedPhone: string }> {
    let user = await this.userRepository.findByEmail(identifier);
    if (!user) {
      user = await this.userRepository.findByUsername(identifier);
    }
    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    // 잠긴 계정도 비밀번호 재설정은 허용하지 않음 / Locked accounts cannot reset password
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { lockedAt: true },
    });
    if (dbUser?.lockedAt) {
      throw new UnauthorizedException('계정이 잠금 처리되었습니다.');
    }

    const sessionId = randomBytes(20).toString('hex');
    const sessionKey = `reset:session:${sessionId}`;
    await this.redis.set(
      sessionKey,
      JSON.stringify({ userId: user.id, phone: user.phone, attemptsLeft: this.LOGIN_MAX_ATTEMPTS, verified: false }),
      'EX',
      this.LOGIN_SESSION_TTL,
    );

    await this.smsVerificationService.sendVerificationCode(user.phone);

    const maskedPhone = this.maskPhone(user.phone);
    this.logger.log(`Password reset SMS sent for: ${user.email}`);

    return { sessionId, maskedPhone };
  }

  async verifyPasswordResetSms(
    sessionId: string,
    code: string,
  ): Promise<{ success: true } | { success: false; attemptsLeft: number; message: string }> {
    const sessionKey = `reset:session:${sessionId}`;
    const raw = await this.redis.get(sessionKey);
    if (!raw) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    const session = JSON.parse(raw) as { userId: string; phone: string; attemptsLeft: number; verified: boolean };

    if (session.attemptsLeft <= 0) {
      await this.redis.del(sessionKey);
      throw new UnauthorizedException('인증 시도 횟수를 초과했습니다.');
    }

    const smsKey = `sms:verify:${session.phone}`;
    const storedCode = await this.redis.get(smsKey);

    if (!storedCode || storedCode !== code) {
      const newAttemptsLeft = session.attemptsLeft - 1;
      if (newAttemptsLeft <= 0) {
        await this.redis.del(sessionKey);
        await this.redis.del(smsKey);
        return { success: false, attemptsLeft: 0, message: '인증 실패 횟수를 초과했습니다.' };
      }
      await this.redis.set(
        sessionKey,
        JSON.stringify({ ...session, attemptsLeft: newAttemptsLeft }),
        'EX',
        await this.redis.ttl(sessionKey),
      );
      return { success: false, attemptsLeft: newAttemptsLeft, message: '인증번호가 일치하지 않습니다.' };
    }

    // SMS 인증 성공 → 세션에 verified 마킹 + TTL 연장 (5분) / Mark verified + extend TTL
    await this.redis.del(smsKey);
    await this.redis.set(
      sessionKey,
      JSON.stringify({ ...session, verified: true }),
      'EX',
      300,
    );

    return { success: true };
  }

  async resetPassword(sessionId: string, newPassword: string, confirmPassword: string): Promise<void> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('비밀번호는 8자 이상이어야 합니다.');
    }

    const sessionKey = `reset:session:${sessionId}`;
    const raw = await this.redis.get(sessionKey);
    if (!raw) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    const session = JSON.parse(raw) as { userId: string; phone: string; verified: boolean };
    if (!session.verified) {
      throw new UnauthorizedException('SMS 인증이 필요합니다.');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash },
    });

    await this.redis.del(sessionKey);
    this.logger.log(`Password reset completed for user: ${session.userId}`);
  }

  async checkDuplicate(field: string, value: string): Promise<boolean> {
    if (!value) return false;
    switch (field) {
      case 'email':
        return !!(await this.userRepository.findByEmail(value));
      case 'username':
        return !!(await this.userRepository.findByUsername(value));
      case 'phone':
        return !!(await this.userRepository.findByPhone(value));
      default:
        return false;
    }
  }

  private toUserDto(user: UserEntity): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      approvalStatus: user.approvalStatus,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
