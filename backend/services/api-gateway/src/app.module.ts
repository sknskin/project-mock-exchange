/**
 * @file API Gateway 루트 모듈
 * @description Auth, Proxy, Health, WebSocket Gateway 모듈을 통합합니다
 *
 * @file API Gateway Root Module
 * @description Integrates Auth, Proxy, Health, and WebSocket Gateway modules
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';
import { HealthController } from './health/health.controller';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
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
    AuthModule,
    ProxyModule,
    GatewayModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
