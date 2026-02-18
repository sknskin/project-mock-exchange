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
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    CqrsModule.forRoot(),
    TerminusModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
