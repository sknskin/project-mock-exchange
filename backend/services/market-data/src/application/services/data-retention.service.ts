/**
 * @file PriceHistory 데이터 보존 크론 서비스
 * @description 매일 새벽 3시에 90일 이상 경과한 PriceHistory 레코드를 삭제합니다
 *
 * @file PriceHistory Data Retention Cron Service
 * @description Deletes PriceHistory records older than 90 days daily at 3am
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  /** 보존 기간: 90일 (Retention period: 90 days) */
  private static readonly RETENTION_DAYS = 90;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * E-C-01: PriceHistory 보존 크론잡 — 매일 새벽 3시 실행
   * 90일 이상 경과한 PriceHistory 레코드를 일괄 삭제합니다.
   *
   * E-C-01: PriceHistory retention cron — runs daily at 3am
   * Bulk-deletes PriceHistory records older than 90 days.
   */
  @Cron('0 3 * * *')
  async purgeStalePriceHistory(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DataRetentionService.RETENTION_DAYS);

    try {
      const result = await this.prisma.priceHistory.deleteMany({
        where: {
          timestamp: { lt: cutoff },
        },
      });

      this.logger.log(
        `PriceHistory retention: deleted ${result.count} records older than ${DataRetentionService.RETENTION_DAYS} days`,
      );
    } catch (error) {
      this.logger.error(
        `PriceHistory retention failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
