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
import { AuthController } from '../presentation/controllers/auth.controller';
import { AdminController } from '../presentation/controllers/admin.controller';
import { AnnouncementController } from '../presentation/controllers/announcement.controller';
import { ProfileController } from '../presentation/controllers/profile.controller';
import { NotificationController } from '../presentation/controllers/notification.controller';
import { StatisticsController } from '../presentation/controllers/statistics.controller';
import { UserController } from '../presentation/controllers/user.controller';
import { PriceAlertController } from '../presentation/controllers/price-alert.controller';
import { JwtStrategy } from '../infrastructure/config/jwt.strategy';
import { UserRepository } from '../infrastructure/persistence/prisma/user.repository';
import { USER_REPOSITORY } from '../domain/repositories/user.repository.interface';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-jwt-secret'),
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
  ],
  providers: [
    AuthService,
    AdminService,
    AnnouncementService,
    SmsVerificationService,
    JwtStrategy,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [AuthService, AdminService, AnnouncementService, SmsVerificationService],
})
export class AuthModule {}
