/**
 * @file AI Service 루트 모듈
 * @description 매매 추천, 포트폴리오 분석 등을 처리하는 AI 서비스 루트 모듈
 *
 * @file AI Service Root Module
 * @description Root module for trade recommendations and portfolio analysis
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    CqrsModule.forRoot(),
    TerminusModule,
    AnalysisModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
