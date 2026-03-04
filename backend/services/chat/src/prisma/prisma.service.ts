/**
 * @file Chat Prisma 서비스
 * @description PrismaClient를 확장하여 NestJS 라이프사이클에 통합합니다
 *
 * @file Chat Prisma Service
 * @description Extends PrismaClient with NestJS lifecycle hooks
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
