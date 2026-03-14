/**
 * @file User Auth 루트 모듈
 * @description Auth, Prisma, Redis 모듈을 통합하는 루트 모듈
 *
 * @file User Auth Root Module
 * @description Root module integrating Auth, Prisma, and Redis modules
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './application/auth.module';
import { DataRetentionService } from './application/services/data-retention.service';
import { HealthController } from './presentation/controllers/health.controller';

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
    ScheduleModule.forRoot(),
    TerminusModule,
    PrismaModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [DataRetentionService],
})
export class AppModule {}
