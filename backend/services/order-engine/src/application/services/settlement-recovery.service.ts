/**
 * @file 정산 복구 서비스
 * @description 실패한 포트폴리오 정산을 주기적으로 재시도합니다
 *
 * @file Settlement Recovery Service
 * @description Periodically retries failed portfolio settlements from the pending queue
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class SettlementRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettlementRecoveryService.name);
  private readonly portfolioUrl: string;
  private readonly internalToken: string;
  private readonly httpTimeout: number;
  /** 최대 재시도 횟수 (초과 시 수동 개입 필요) / Max retries before requiring manual intervention */
  private static readonly MAX_RETRIES = 20;
  /** 재시도 주기 (30초) / Retry interval */
  private static readonly RETRY_INTERVAL_MS = 30_000;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.portfolioUrl = this.config.getOrThrow<string>('PORTFOLIO_URL');
    this.internalToken = this.config.getOrThrow<string>('INTERNAL_SERVICE_SECRET');
    this.httpTimeout = this.config.get<number>('INTERNAL_HTTP_TIMEOUT', 5000);
  }

  onModuleInit() {
    this.intervalHandle = setInterval(() => {
      this.processPendingSettlements().catch((err) => {
        this.logger.error(`Recovery loop error: ${err instanceof Error ? err.message : err}`);
      });
    }, SettlementRecoveryService.RETRY_INTERVAL_MS);
    this.logger.log('Settlement recovery service started (interval: 30s)');
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * pending_settlements에서 미정산 건을 가져와 재시도합니다.
   * Fetches pending settlements and retries them against the portfolio service.
   */
  private async processPendingSettlements(): Promise<void> {
    const pendings = await this.prisma.pendingSettlement.findMany({
      where: { retries: { lt: SettlementRecoveryService.MAX_RETRIES } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    if (pendings.length === 0) return;

    this.logger.log(`[RECOVERY] Processing ${pendings.length} pending settlement(s)...`);

    // 병렬 처리 — 독립적인 정산 건을 동시에 재시도하여 총 처리 시간 최소화
    // Parallel processing — retry independent settlements concurrently to minimize total processing time
    await Promise.allSettled(pendings.map(async (ps) => {
      const endpoint = ps.side === 'BUY' ? 'settle-buy' : 'settle-sell';
      try {
        await axios.post(
          `${this.portfolioUrl}/portfolio/internal/${endpoint}`,
          {
            symbol: ps.symbol,
            quantity: ps.quantity,
            price: ps.price,
            tradeId: ps.tradeId,
          },
          {
            headers: { 'x-user-id': ps.userId, 'x-internal-token': this.internalToken },
            timeout: this.httpTimeout,
          },
        );

        // 정산 성공 — 큐에서 제거 / Settlement succeeded — remove from queue
        await this.prisma.pendingSettlement.delete({ where: { id: ps.id } });
        this.logger.log(`[RECOVERY] Settled ${ps.side} for trade ${ps.tradeId} (user=${ps.userId.substring(0, 8)}...)`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // 4xx 에러 시 재시도 무의미 — 최대 재시도로 설정하여 더 이상 재시도하지 않음
        // 4xx errors won't self-heal — mark as max retries to stop retrying
        const axiosErr = error as { response?: { status?: number } };
        const status = axiosErr?.response?.status;
        const newRetries = (status && status >= 400 && status < 500)
          ? SettlementRecoveryService.MAX_RETRIES
          : ps.retries + 1;

        await this.prisma.pendingSettlement.update({
          where: { id: ps.id },
          data: { retries: newRetries, lastError: message },
        });

        if (newRetries >= SettlementRecoveryService.MAX_RETRIES) {
          this.logger.error(`[RECOVERY_EXHAUSTED] ${ps.side} settlement for trade ${ps.tradeId} exceeded max retries — manual intervention required`);
        } else {
          this.logger.warn(`[RECOVERY_RETRY] ${ps.side} trade ${ps.tradeId} retry ${newRetries}/${SettlementRecoveryService.MAX_RETRIES}: ${message}`);
        }
      }
    }));
  }
}
