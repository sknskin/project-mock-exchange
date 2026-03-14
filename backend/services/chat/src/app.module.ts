/**
 * @file Chat 루트 모듈
 * @description 글로벌/자산별 채팅을 처리하는 채팅 서비스 루트 모듈
 *
 * @file Chat Root Module
 * @description Root module for global and asset-based chat service
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './chat/chat.module';

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
    ScheduleModule.forRoot(),
    TerminusModule,
    PrismaModule,
    ChatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
