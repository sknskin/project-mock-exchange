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
