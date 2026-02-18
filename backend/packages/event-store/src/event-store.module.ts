/**
 * @file Event Store 모듈
 * @description PostgreSQL 기반 이벤트 저장소를 NestJS 모듈로 제공합니다
 *
 * @file Event Store Module
 * @description Provides PostgreSQL-based event store as a NestJS module
 */
import { DynamicModule, Global, Module, InjectionToken } from '@nestjs/common';
import { PoolConfig } from 'pg';
import { EventStoreService } from './event-store.service';

export interface EventStoreModuleOptions {
  connectionConfig: PoolConfig;
}

@Global()
@Module({})
export class EventStoreModule {
  static forRoot(options: EventStoreModuleOptions): DynamicModule {
    return {
      module: EventStoreModule,
      providers: [
        {
          provide: EventStoreService,
          useFactory: () => {
            return new EventStoreService(options.connectionConfig);
          },
        },
      ],
      exports: [EventStoreService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => EventStoreModuleOptions | Promise<EventStoreModuleOptions>;
    inject?: InjectionToken[];
  }): DynamicModule {
    return {
      module: EventStoreModule,
      providers: [
        {
          provide: EventStoreService,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory(...args);
            return new EventStoreService(config.connectionConfig);
          },
          inject: options.inject || [],
        },
      ],
      exports: [EventStoreService],
    };
  }
}
