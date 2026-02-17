import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { JwtPayload, AuthTokensDto, UserDto } from '@mock-exchange/common';
import {
  USER_REPOSITORY,
  IUserRepository,
} from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
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
  ) {}

  async register(email: string, username: string, password: string): Promise<UserDto> {
    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    const user = UserEntity.create({
      id: '',
      email,
      username,
      passwordHash,
    });

    const created = await this.userRepository.create(user);
    this.logger.log(`User registered: ${created.email}`);

    return this.toUserDto(created);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: UserDto; tokens: AuthTokensDto; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
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

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = new UserEntity(
      stored.user.id,
      stored.user.email,
      stored.user.username,
      stored.user.passwordHash,
      stored.user.role as JwtPayload['role'],
      stored.user.isActive,
      stored.user.createdAt,
      stored.user.updatedAt,
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
    if (!match) return 900; // default 15min
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

  private toUserDto(user: UserEntity): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
