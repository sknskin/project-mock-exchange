import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { EventStoreModule } from '@mock-exchange/event-store';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { MatchingEngineService } from './domain/services/matching-engine.service';
import { OrderService } from './application/services/order.service';
import { OrderController } from './presentation/controllers/order.controller';
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
    EventStoreModule.forRootAsync({
      useFactory: (...args: unknown[]) => {
        const config = args[0] as ConfigService;
        return {
          connectionConfig: {
            connectionString: config.get<string>(
              'ORDER_ENGINE_DATABASE_URL',
              'postgresql://postgres:postgres@localhost:5432/mex_orders',
            ),
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
