/**
 * @file Portfolio 루트 모듈
 * @description 잔고 관리, 보유 자산, 거래 내역 모듈을 통합합니다
 *
 * @file Portfolio Root Module
 * @description Integrates balance management, holdings, and transaction modules
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { BalanceService } from './domain/services/balance.service';
import { PortfolioController } from './presentation/controllers/portfolio.controller';
import { InternalController } from './presentation/controllers/internal.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    CqrsModule.forRoot(),
    TerminusModule,
    PrismaModule,
  ],
  controllers: [HealthController, PortfolioController, InternalController],
  providers: [BalanceService],
})
export class AppModule {}
