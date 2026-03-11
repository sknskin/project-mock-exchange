/**
 * @file Redis 모듈
 * @description IoRedis 클라이언트를 NestJS 모듈로 제공합니다
 *
 * @file Redis Module
 * @description Provides IoRedis client as a NestJS module
 */
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', undefined),
          maxRetriesPerRequest: 3,
          // H-11: 명령어 타임아웃 5초 — Redis 응답 지연 시 무한 대기 방지
          // H-11: Command timeout 5s — prevent infinite hang on Redis response delay
          commandTimeout: 5000,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
