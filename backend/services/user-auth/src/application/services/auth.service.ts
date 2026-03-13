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
import { SettingsService } from './settings.service';
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
    private readonly settingsService: SettingsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.SALT_ROUNDS = this.configService.get<number>('SALT_ROUNDS', 12);
    this.LOGIN_SESSION_TTL = this.configService.get<number>('LOGIN_SESSION_TTL', 180);
    this.LOGIN_MAX_ATTEMPTS = this.configService.get<number>('LOGIN_MAX_ATTEMPTS', 5);
  }

  /** 세션 보안 설정 캐시 (30초 TTL) / Session security settings cache (30s TTL) */
  private sessionSettingsCache: { sessionTimeoutMinutes: number; maxLoginAttempts: number; fetchedAt: number } | null = null;

  /**
   * DB에서 세션 보안 설정을 동적으로 조회 (캐시 적용)
   * Dynamically fetch session security settings from DB (with cache)
   */
  private async getSessionSecuritySettings(): Promise<{ sessionTimeoutMinutes: number; maxLoginAttempts: number }> {
    const now = Date.now();
    if (this.sessionSettingsCache && now - this.sessionSettingsCache.fetchedAt < 30_000) {
      return this.sessionSettingsCache;
    }

    try {
      const all = await this.settingsService.getAll();
      const sessionTimeoutMinutes = Number(all['sessionSecurity.sessionTimeoutMinutes']) || this.LOGIN_SESSION_TTL;
      const maxLoginAttempts = Number(all['sessionSecurity.maxLoginAttempts']) || this.LOGIN_MAX_ATTEMPTS;
      this.sessionSettingsCache = { sessionTimeoutMinutes, maxLoginAttempts, fetchedAt: now };
      return { sessionTimeoutMinutes, maxLoginAttempts };
    } catch {
      return { sessionTimeoutMinutes: this.LOGIN_SESSION_TTL, maxLoginAttempts: this.LOGIN_MAX_ATTEMPTS };
    }
  }

  /** 회원가입 처리 — 중복 확인, SMS 인증 확인, 주민번호 암호화 후 사용자 생성
   * Register user — check duplicates, verify SMS, encrypt RRN, create user */
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

    // 주민등록번호 암호화 / Encrypt resident number
    const rrn = ResidentNumber.from(residentNumber);
    const rrnValidation = rrn.validate();
    if (!rrnValidation.valid) {
      throw new BadRequestException(`Invalid resident number: ${rrnValidation.message}`);
    }

    // C-07: 전용 ENCRYPTION_KEY 사용, 미설정 시 JWT_SECRET으로 대체 (하위 호환)
    // C-07: Use dedicated ENCRYPTION_KEY, fall back to JWT_SECRET for backward compatibility
    const rrnSecret = this.configService.get<string>('ENCRYPTION_KEY')
      ?? this.configService.getOrThrow<string>('JWT_SECRET');
    const encryptionSalt = this.configService.getOrThrow<string>('ENCRYPTION_SALT');
    const encryptedRrn = rrn.encrypt(rrnSecret, encryptionSalt);

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // C-06: 중복 확인 + 사용자 생성을 Prisma 트랜잭션으로 원자적 처리
    // C-06: Wrap duplicate checks + user creation in a Prisma transaction for atomicity
    let created: UserEntity;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const existingEmail = await tx.user.findUnique({ where: { email } });
        if (existingEmail) {
          throw new ConflictException('이미 등록된 이메일입니다.');
        }

        const existingUsername = await tx.user.findUnique({ where: { username } });
        if (existingUsername) {
          throw new ConflictException('이미 사용 중인 사용자명입니다.');
        }

        const existingPhone = await tx.user.findUnique({ where: { phone } });
        if (existingPhone) {
          throw new ConflictException('이미 등록된 전화번호입니다.');
        }

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

        const row = await tx.user.create({
          data: {
            email: user.email,
            username: user.username,
            passwordHash: user.passwordHash,
            name: user.name,
            role: user.role,
            approvalStatus: user.approvalStatus as never,
            phone: user.phone,
            encryptedRrn: user.encryptedRrn,
            address: user.address,
            addressDetail: user.addressDetail ?? undefined,
            zipCode: user.zipCode,
          },
        });

        return new UserEntity(
          row.id, row.email, row.username, row.passwordHash, row.name,
          row.role as JwtPayload['role'], row.isActive, row.approvalStatus,
          row.approvedAt, row.approvedBy, row.approvalNote,
          row.rejectedAt, row.rejectedBy, row.rejectionNote,
          row.createdAt, row.updatedAt, row.phone, row.encryptedRrn,
          row.address, row.addressDetail, row.zipCode,
        );
      });
    } catch (error) {
      // P2002: Prisma unique constraint violation — 동시 요청 시 중복 방지 폴백
      // P2002: Prisma unique constraint violation — fallback for concurrent duplicate
      const prismaError = error as { code?: string; meta?: Record<string, unknown> };
      if (prismaError.code === 'P2002') {
        const fields = (prismaError.meta?.target as string[]) ?? [];
        if (fields.includes('email')) {
          throw new ConflictException('이미 등록된 이메일입니다.');
        }
        if (fields.includes('username')) {
          throw new ConflictException('이미 사용 중인 사용자명입니다.');
        }
        if (fields.includes('phone')) {
          throw new ConflictException('이미 등록된 전화번호입니다.');
        }
        throw new ConflictException('이미 등록된 정보입니다.');
      }
      throw error;
    }
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

  /** 로그인 1단계 — 비밀번호 검증 후 SMS 인증 세션 생성
   * Login step 1 — verify password, then create SMS verification session */
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
    const securitySettings = await this.getSessionSecuritySettings();
    const sessionId = randomBytes(20).toString('hex');
    const sessionKey = `login:session:${sessionId}`;
    await this.redis.set(
      sessionKey,
      JSON.stringify({ userId: user.id, phone: user.phone, attemptsLeft: securitySettings.maxLoginAttempts }),
      'EX',
      securitySettings.sessionTimeoutMinutes * 60,
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

    // M-07: Redis 세션 JSON 파싱 오류 방어 / Guard against corrupted Redis session JSON
    const session = this.safeParseSession<{ userId: string; phone: string; attemptsLeft: number }>(raw, sessionKey);
    await this.smsVerificationService.sendVerificationCode(session.phone);

    // 세션 TTL 갱신 — 재전송 시 만료 시간 연장 / Renew session TTL — extend expiry on resend
    const securitySettings = await this.getSessionSecuritySettings();
    await this.redis.expire(sessionKey, securitySettings.sessionTimeoutMinutes * 60);

    const maskedPhone = this.maskPhone(session.phone);
    this.logger.log(`Login SMS resent for session: ${sessionId}`);
    return { maskedPhone };
  }

  /** 로그인 2단계 — SMS 인증코드 검증 후 JWT 발급
   * Login step 2 — verify SMS code and issue JWT tokens */
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

    // M-07: Redis 세션 JSON 파싱 오류 방어 / Guard against corrupted Redis session JSON
    const session = this.safeParseSession<{ userId: string; phone: string; attemptsLeft: number }>(raw, sessionKey);

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

  /** 계정 잠금 처리 — 인증 시도 초과 시 호출
   * Lock user account — called when verification attempts exceeded */
  private async lockUser(userId: string, reason: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lockedAt: new Date(), lockedReason: reason },
    });
    this.logger.warn(`Account locked: ${userId} - ${reason}`);
  }

  /** 전화번호 마스킹 (예: 010****1234)
   * Mask phone number (e.g., 010****1234) */
  private maskPhone(phone: string): string {
    if (phone.length < 8) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  /** 리프레시 토큰으로 액세스 토큰 갱신 (토큰 로테이션 적용)
   * Refresh access token using refresh token (with token rotation) */
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

    // H-09: 리프레시 토큰 로테이션 (삭제 + 생성)을 트랜잭션으로 원자적 처리
    // H-09: Wrap refresh token rotation (delete old + create new) in a Prisma transaction
    const newToken = randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newToken);
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRY', '7d');
    const expiresAt = new Date(Date.now() + this.parseExpiry(expiresIn) * 1000);

    await this.prisma.$transaction([
      this.prisma.refreshToken.delete({ where: { id: stored.id } }),
      this.prisma.refreshToken.create({
        data: { userId: user.id, tokenHash: newTokenHash, expiresAt },
      }),
    ]);

    return { tokens, refreshToken: newToken };
  }

  /** 로그아웃 — DB에서 리프레시 토큰 삭제
   * Logout — delete refresh token from DB */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  /** JWT 페이로드로 사용자 유효성 검증
   * Validate user from JWT payload */
  async validateUser(payload: JwtPayload): Promise<UserDto | null> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) return null;
    return this.toUserDto(user);
  }

  /** JWT 액세스 토큰 생성
   * Generate JWT access token */
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

  /** 리프레시 토큰 생성 및 DB 저장
   * Create refresh token and store in DB */
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

  /** 토큰 SHA-256 해싱 — DB 저장용
   * Hash token with SHA-256 for DB storage */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** 만료 시간 문자열을 초 단위로 변환 (예: '15m' → 900)
   * Parse expiry string to seconds (e.g., '15m' → 900) */
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

    // M-07: Redis 세션 JSON 파싱 오류 방어 / Guard against corrupted Redis session JSON
    const session = this.safeParseSession<{ userId: string; phone: string; attemptsLeft: number; verified: boolean }>(raw, sessionKey);
    await this.smsVerificationService.sendVerificationCode(session.phone);
    // 세션 TTL 갱신 — 재전송 시 만료 시간 연장 / Renew session TTL — extend expiry on resend
    const resetSecuritySettings = await this.getSessionSecuritySettings();
    await this.redis.expire(sessionKey, resetSecuritySettings.sessionTimeoutMinutes * 60);

    const maskedPhone = this.maskPhone(session.phone);
    this.logger.log(`Password reset SMS resent for session: ${sessionId}`);
    return { maskedPhone };
  }

  // ── 비밀번호 재설정 (Password Reset) ──

  /** 비밀번호 재설정 요청 — SMS 인증 세션 생성
   * Request password reset — create SMS verification session */
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

    const resetSettings = await this.getSessionSecuritySettings();
    const sessionId = randomBytes(20).toString('hex');
    const sessionKey = `reset:session:${sessionId}`;
    await this.redis.set(
      sessionKey,
      JSON.stringify({ userId: user.id, phone: user.phone, attemptsLeft: resetSettings.maxLoginAttempts, verified: false }),
      'EX',
      resetSettings.sessionTimeoutMinutes * 60,
    );

    await this.smsVerificationService.sendVerificationCode(user.phone);

    const maskedPhone = this.maskPhone(user.phone);
    this.logger.log(`Password reset SMS sent for: ${user.email}`);

    return { sessionId, maskedPhone };
  }

  /** 비밀번호 재설정 SMS 인증코드 검증
   * Verify password reset SMS verification code */
  async verifyPasswordResetSms(
    sessionId: string,
    code: string,
  ): Promise<{ success: true } | { success: false; attemptsLeft: number; message: string }> {
    const sessionKey = `reset:session:${sessionId}`;
    const raw = await this.redis.get(sessionKey);
    if (!raw) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    // M-07: Redis 세션 JSON 파싱 오류 방어 / Guard against corrupted Redis session JSON
    const session = this.safeParseSession<{ userId: string; phone: string; attemptsLeft: number; verified: boolean }>(raw, sessionKey);

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

  /** 비밀번호 재설정 — SMS 인증 완료 후 새 비밀번호 저장
   * Reset password — save new password after SMS verification */
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

    // M-07: Redis 세션 JSON 파싱 오류 방어 / Guard against corrupted Redis session JSON
    const session = this.safeParseSession<{ userId: string; phone: string; verified: boolean }>(raw, sessionKey);
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

  /** M-07: Redis 세션 JSON 안전 파싱 — 손상된 데이터 시 세션 삭제 후 만료 처리
   * M-07: Safe JSON parse for Redis sessions — delete corrupted data and treat as expired */
  private safeParseSession<T>(raw: string, sessionKey: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`Corrupted Redis session data for key: ${sessionKey}`);
      this.redis.del(sessionKey).catch(() => {});
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }
  }

  /** 필드별 중복 확인 (이메일/아이디/전화번호)
   * Check field duplication (email/username/phone) */
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

  /** UserEntity를 UserDto로 변환
   * Convert UserEntity to UserDto */
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
