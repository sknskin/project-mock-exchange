/**
 * @file ReadReceipt TTL 정리 크론 서비스
 * @description 매일 새벽 5시에 30일 이상 비활성 채팅방의 ReadReceipt 레코드를 삭제합니다
 *
 * @file ReadReceipt TTL Cleanup Cron Service
 * @description Deletes ReadReceipt records for rooms inactive 30+ days daily at 5am
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  /** 비활성 기준: 30일 (Inactivity threshold: 30 days) */
  private static readonly INACTIVITY_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * E-H-01: ReadReceipt TTL 정리 크론잡 — 매일 새벽 5시 실행
   * 30일 이상 비활성(updatedAt 기준) 채팅방에 속한 메시지의 ReadReceipt를 삭제합니다.
   *
   * E-H-01: ReadReceipt TTL cleanup cron — runs daily at 5am
   * Deletes ReadReceipt records where the associated room has been inactive for 30+ days.
   */
  @Cron('0 5 * * *')
  async purgeStaleReadReceipts(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DataRetentionService.INACTIVITY_DAYS);

    try {
      // 비활성 채팅방의 메시지에 연결된 ReadReceipt 삭제
      // Delete ReadReceipts linked to messages in inactive rooms
      const result = await this.prisma.readReceipt.deleteMany({
        where: {
          message: {
            room: {
              updatedAt: { lt: cutoff },
            },
          },
        },
      });

      this.logger.log(
        `ReadReceipt TTL cleanup: deleted ${result.count} records from rooms inactive for ${DataRetentionService.INACTIVITY_DAYS}+ days`,
      );
    } catch (error) {
      this.logger.error(
        `ReadReceipt TTL cleanup failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
