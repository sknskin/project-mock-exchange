/**
 * @file Notification 루트 모듈
 * @description 체결 알림, 가격 알림 등을 처리하는 알림 서비스 루트 모듈
 *
 * @file Notification Root Module
 * @description Root module for trade alerts, price alerts, and notifications
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `../../.env.${process.env.NODE_ENV || 'development'}`,
        '../../.env',
        '.env',
      ],
    }),
    CqrsModule.forRoot(),
    TerminusModule,
    EmailModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
