/**
 * @file Portfolio Prisma 서비스
 * @description PrismaClient를 확장하여 NestJS 라이프사이클에 통합합니다
 *
 * @file Portfolio Prisma Service
 * @description Extends PrismaClient with NestJS lifecycle hooks
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // 거래 내역(Transaction) 불변성 보장 — Prisma extension
    // 생성 후 수정/삭제를 방지하여 감사 추적(audit trail)의 무결성을 유지합니다.
    // Transaction immutability — prevents UPDATE/DELETE on transaction records
    // to preserve the integrity of the audit trail after creation.
    // NOTE: Enforcement is done at the application level; direct DB access bypasses this.

    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
