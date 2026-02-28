/**
 * @file API Gateway 루트 모듈
 * @description Auth, Proxy, Health, WebSocket Gateway 모듈을 통합합니다
 *
 * @file API Gateway Root Module
 * @description Integrates Auth, Proxy, Health, and WebSocket Gateway modules
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';
import { HealthController } from './health/health.controller';
import { GatewayModule } from './gateway/gateway.module';
import { RedisModule } from './redis/redis.module';

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
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ({
        throttlers: [
          {
            ttl: 60000, // 1 minute window
            limit: 100, // 100 requests per minute
          },
        ],
      }),
    }),
    TerminusModule,
    RedisModule,
    AuthModule,
    ProxyModule,
    GatewayModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
