/**
 * @file Order Engine 루트 모듈
 * @description 주문 처리, 매칭 엔진, 이벤트 스토어를 통합하는 루트 모듈
 *
 * @file Order Engine Root Module
 * @description Root module integrating order processing, matching engine, and event store
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { EventStoreModule } from '@virtuex/event-store';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { MatchingEngineService } from './domain/services/matching-engine.service';
import { OrderService } from './application/services/order.service';
import { OrderController } from './presentation/controllers/order.controller';
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
    EventStoreModule.forRootAsync({
      useFactory: (...args: unknown[]) => {
        const config = args[0] as ConfigService;
        return {
          connectionConfig: {
            connectionString: config.getOrThrow<string>('ORDER_ENGINE_DATABASE_URL'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [OrderController, HealthController],
  providers: [MatchingEngineService, OrderService],
})
export class AppModule {}
