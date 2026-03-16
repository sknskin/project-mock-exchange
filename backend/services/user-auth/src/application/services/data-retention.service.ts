/**
 * @file PageView 데이터 보존 크론 서비스
 * @description 매일 새벽 4시에 180일 이상 경과한 PageView 레코드를 삭제합니다
 *
 * @file PageView Data Retention Cron Service
 * @description Deletes PageView records older than 180 days daily at 4am
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  /** 보존 기간: 180일 (Retention period: 180 days) */
  private static readonly RETENTION_DAYS = 180;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 만료된 RefreshToken 정리 — 매일 새벽 3시 30분 실행
   * Expired RefreshToken cleanup — runs daily at 3:30am
   */
  @Cron('30 3 * * *')
  async purgeExpiredRefreshTokens(): Promise<void> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (result.count > 0) {
        this.logger.log(`RefreshToken cleanup: deleted ${result.count} expired tokens`);
      }
    } catch (error) {
      this.logger.error(
        `RefreshToken cleanup failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /**
   * E-C-02: PageView 보존 크론잡 — 매일 새벽 4시 실행
   * 180일 이상 경과한 PageView 레코드를 일괄 삭제합니다.
   *
   * E-C-02: PageView retention cron — runs daily at 4am
   * Bulk-deletes PageView records older than 180 days.
   */
  @Cron('0 4 * * *')
  async purgeStalePageViews(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DataRetentionService.RETENTION_DAYS);

    try {
      const result = await this.prisma.pageView.deleteMany({
        where: {
          createdAt: { lt: cutoff },
        },
      });

      this.logger.log(
        `PageView retention: deleted ${result.count} records older than ${DataRetentionService.RETENTION_DAYS} days`,
      );
    } catch (error) {
      this.logger.error(
        `PageView retention failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
