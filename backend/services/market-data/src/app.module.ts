/**
 * @file Market Data 루트 모듈
 * @description 가격 엔진, 캐시, Kafka 프로듀서 등을 통합하는 루트 모듈
 *
 * @file Market Data Root Module
 * @description Root module integrating price engine, cache, and Kafka producer
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from './infrastructure/persistence/prisma.module';
import { PriceEngineService } from './domain/services/price-engine.service';
import { BinancePriceService } from './domain/services/binance-price.service';
import { PriceCacheService } from './infrastructure/redis/price-cache.service';
import { PriceProducerService } from './infrastructure/kafka/price-producer.service';
import { MarketDataService } from './application/services/market-data.service';
import { NewsService } from './application/services/news.service';
import { MarketController } from './presentation/controllers/market.controller';
import { NewsController } from './presentation/controllers/news.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    TerminusModule,
    PrismaModule,
  ],
  controllers: [MarketController, NewsController, HealthController],
  providers: [
    PriceEngineService,
    BinancePriceService,
    PriceCacheService,
    PriceProducerService,
    MarketDataService,
    NewsService,
  ],
})
export class AppModule {}
