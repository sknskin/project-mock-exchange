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
import { WatchlistService } from './domain/services/watchlist.service';
import { PortfolioController } from './presentation/controllers/portfolio.controller';
import { WatchlistController } from './presentation/controllers/watchlist.controller';
import { InternalController } from './presentation/controllers/internal.controller';
import { HealthController } from './health/health.controller';

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
    PrismaModule,
  ],
  controllers: [HealthController, PortfolioController, WatchlistController, InternalController],
  providers: [BalanceService, WatchlistService],
})
export class AppModule {}
