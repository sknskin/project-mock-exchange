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
import {
  USER_REPOSITORY,
  IUserRepository,
} from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { ResidentNumber } from '../../domain/value-objects/resident-number.vo';
import { SmsVerificationService } from './sms-verification.service';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly smsVerificationService: SmsVerificationService,
  ) {}

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
      throw new BadRequestException('Passwords do not match');
    }

    const phoneVerified = await this.smsVerificationService.isPhoneVerified(phone);
    if (!phoneVerified) {
      throw new BadRequestException('Phone number not verified');
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const existingPhone = await this.userRepository.findByPhone(phone);
    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // 주민등록번호 암호화 / Encrypt resident number
    const rrn = ResidentNumber.from(residentNumber);
    const rrnValidation = rrn.validate();
    if (!rrnValidation.valid) {
      throw new BadRequestException(`Invalid resident number: ${rrnValidation.message}`);
    }

    const rrnSecret = this.configService.get('JWT_SECRET', 'dev-jwt-secret');
    const encryptedRrn = rrn.encrypt(rrnSecret);

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
      }).catch(() => {});
    }

    return this.toUserDto(created);
  }

  async login(
    identifier: string,
    password: string,
  ): Promise<{ user: UserDto; tokens: AuthTokensDto; refreshToken: string }> {
    let user = await this.userRepository.findByEmail(identifier);
    if (!user) {
      user = await this.userRepository.findByUsername(identifier);
    }
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 미승인/반려 회원 로그인 거부 (SYSTEM 계정 예외) / Deny unapproved/rejected users (except SYSTEM)
    if (user.approvalStatus !== 'APPROVED' && user.role !== USER_ROLE.SYSTEM) {
      if (user.approvalStatus === 'REJECTED') {
        throw new UnauthorizedException('Account has been rejected');
      }
      throw new UnauthorizedException('Account not yet approved');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    const refreshToken = await this.createRefreshToken(user.id);

    // 통계를 위한 로그인 기록 (Log login for statistics)
    await this.prisma.loginLog.create({ data: { userId: user.id } }).catch(() => {});

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: this.toUserDto(user),
      tokens,
      refreshToken,
    };
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
      throw new UnauthorizedException('Invalid or expired refresh token');
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
