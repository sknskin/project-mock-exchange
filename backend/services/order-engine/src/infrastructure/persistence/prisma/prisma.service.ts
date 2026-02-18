/**
 * @file Order Engine Prisma 서비스
 * @description PrismaClient를 확장하여 NestJS 라이프사이클에 통합합니다
 *
 * @file Order Engine Prisma Service
 * @description Extends PrismaClient with NestJS lifecycle hooks
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
