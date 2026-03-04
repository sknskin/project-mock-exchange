/**
 * @file 인증 애플리케이션 모듈
 * @description JWT, Passport, Auth Service를 구성하는 인증 모듈
 *
 * @file Auth Application Module
 * @description Configures JWT, Passport, and Auth Service for authentication
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { AdminService } from './services/admin.service';
import { AnnouncementService } from './services/announcement.service';
import { SmsVerificationService } from './services/sms-verification.service';
import { TotpService } from './services/totp.service';
import { SettingsService } from './services/settings.service';
import { AuthController } from '../presentation/controllers/auth.controller';
import { AdminController } from '../presentation/controllers/admin.controller';
import { AnnouncementController } from '../presentation/controllers/announcement.controller';
import { ProfileController } from '../presentation/controllers/profile.controller';
import { NotificationController } from '../presentation/controllers/notification.controller';
import { StatisticsController } from '../presentation/controllers/statistics.controller';
import { UserController } from '../presentation/controllers/user.controller';
import { PriceAlertController } from '../presentation/controllers/price-alert.controller';
import { SettingsController } from '../presentation/controllers/settings.controller';
import { CommunityController } from '../presentation/controllers/community.controller';
import { JwtStrategy } from '../infrastructure/config/jwt.strategy';
import { UserRepository } from '../infrastructure/persistence/prisma/user.repository';
import { USER_REPOSITORY } from '../domain/repositories/user.repository.interface';

@Module({
  imports: [
    // Passport: JWT 전략을 기본 인증 전략으로 등록 / Register JWT strategy as default auth strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // JWT: 환경변수에서 시크릿 키와 만료 시간 로드 (기본 15분) / Load secret key and expiry from env vars (default 15m)
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRY', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [
    AuthController,
    AdminController,
    AnnouncementController,
    ProfileController,
    NotificationController,
    StatisticsController,
    UserController,
    PriceAlertController,
    SettingsController,
    CommunityController,
  ],
  providers: [
    AuthService,           // 회원가입/로그인/토큰 관리 / Registration, login, token management
    AdminService,          // 관리자 사용자 관리 / Admin user management
    AnnouncementService,   // 공지사항 CRUD / Announcement CRUD
    SmsVerificationService, // SMS 인증코드 발송/검증 / SMS code sending/verification
    TotpService,           // TOTP 2FA 관리 / TOTP 2FA management
    SettingsService,       // 시스템 설정 관리 / System settings management
    JwtStrategy,           // Passport JWT 전략 구현 / Passport JWT strategy implementation
    {
      // 의존성 역전: 도메인 인터페이스에 Prisma 구현체 바인딩
      // Dependency Inversion: bind Prisma implementation to domain interface
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [AuthService, AdminService, AnnouncementService, SmsVerificationService, TotpService, SettingsService],
})
export class AuthModule {}
