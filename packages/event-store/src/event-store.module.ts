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
