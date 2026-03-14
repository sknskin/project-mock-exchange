/**
 * @file 가격 구독 서비스
 * @description Redis PubSub으로 실시간 가격 업데이트를 구독하여 WebSocket으로 전달합니다.
 *              활성 가격 알림을 주기적으로 로드하고, 조건 충족 시 알림을 발송합니다.
 *
 * @file Price Subscriber Service
 * @description Subscribes to real-time price updates via Redis PubSub and forwards to WebSocket.
 *              Periodically loads active price alerts and triggers notifications when conditions are met.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import axios from 'axios';
import { PriceGateway } from './price.gateway';
import { ChatGateway } from './chat.gateway';

interface CachedAlert {
  id: string;
  userId: string;
  symbol: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  currency: string;
  displayTargetPrice: number | null;
}

@Injectable()
export class PriceSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceSubscriberService.name);
  private subscriber: Redis;

  private alertsBySymbol = new Map<string, CachedAlert[]>();
  // 심볼별 마지막 가격 알림 확인 시각 — 틱마다 확인하지 않도록 초당 1회 제한
  // Last price alert check timestamp per symbol — throttle to at most once per second per symbol
  private lastAlertCheckBySymbol = new Map<string, number>();
  private alertRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private alertRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private consecutiveFailures = 0;
  private static readonly MAX_BACKOFF_MS = 5 * 60_000; // 최대 5분 백오프 (max 5 min backoff)
  private static readonly BASE_INTERVAL_MS = 30_000;   // 기본 30초 간격 (base 30s interval)
  private readonly userAuthUrl: string;
  private readonly internalToken: string;

  /** G-H-01: 가격 업데이트를 일괄 처리하기 위한 버퍼
   * G-H-01: Buffer for batching price broadcasts */
  private priceBatchBuffer = new Map<string, unknown>();
  private batchFlushTimer: ReturnType<typeof setTimeout> | null = null;
  /** G-H-01: 배치 플러시 주기 (100ms) — 심볼별 개별 emit 대신 일괄 전송
   * G-H-01: Batch flush interval (100ms) — batched emit instead of per-symbol */
  private static readonly BATCH_FLUSH_MS = 100;

  constructor(
    private readonly configService: ConfigService,
    private readonly priceGateway: PriceGateway,
    private readonly chatGateway: ChatGateway,
  ) {
    const host = this.configService.get('SERVICE_HOST', 'localhost');
    const port = this.configService.get('USER_AUTH_PORT', 3007);
    this.userAuthUrl = `http://${host}:${port}`;
    this.internalToken = this.configService.get<string>('INTERNAL_SERVICE_SECRET', '');
  }

  /** Redis PubSub 구독 시작 및 가격 알림 주기적 갱신 설정
   * Start Redis PubSub subscriptions and set up periodic alert refresh */
  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.subscriber = new Redis(redisUrl);
    this.subscriber.on('error', (err) => this.logger.error('Redis subscriber error', err));

    // G-H-01: 패턴 구독으로 모든 종목의 가격 채널을 한 번에 구독하고, 버퍼에 축적 후 일괄 브로드캐스트
    // G-H-01: Pattern subscribe to all price channels; buffer updates and flush as batch
    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      try {
        const priceData = JSON.parse(message);
        const symbol = channel.replace('prices:', '');
        // 가격 알림은 즉시 확인 (실시간 조건 충족 판단) / Check alerts immediately (real-time condition check)
        this.checkPriceAlerts(symbol, priceData.price);
        // 브로드캐스트는 버퍼에 축적 / Buffer broadcast for batching
        this.priceBatchBuffer.set(symbol, priceData);
        this.scheduleBatchFlush();
      } catch (err) {
        this.logger.error(`Failed to parse price message: ${err}`);
      }
    });

    await this.subscriber.psubscribe('prices:*');

    this.logger.log('Subscribed to all price channels via Redis PSUBSCRIBE prices:*');

    // 시작 시 알림 로드 후 스케줄 갱신 — 실패 시 지수 백오프 적용
    // Load alerts on startup then schedule refresh — exponential backoff on failure
    this.refreshAlerts().catch((e) => this.logger.warn('Initial refreshAlerts failed', e.message));
    this.scheduleNextRefresh();
  }

  /**
   * G-H-01: 배치 플러시 타이머를 예약합니다. 이미 예약된 경우 중복 예약하지 않습니다.
   * G-H-01: Schedules a batch flush timer. Skips if one is already scheduled.
   */
  private scheduleBatchFlush() {
    if (this.batchFlushTimer) return;
    this.batchFlushTimer = setTimeout(() => {
      this.flushPriceBatch();
      this.batchFlushTimer = null;
    }, PriceSubscriberService.BATCH_FLUSH_MS);
  }

  /**
   * G-H-01: 버퍼에 축적된 가격 업데이트를 일괄 브로드캐스트합니다.
   * 개별 emit 대신 하나의 'price:batch' 이벤트로 묶어서 전송하고,
   * 기존 개별 채널 구독 호환을 위해 per-symbol emit도 유지합니다.
   *
   * G-H-01: Flushes buffered price updates as a batch broadcast.
   * Sends a single 'price:batch' event and maintains per-symbol emit for backward compatibility.
   */
  private flushPriceBatch() {
    if (this.priceBatchBuffer.size === 0) return;
    // 개별 심볼 채널로도 전송 (기존 클라이언트 호환) / Per-symbol emit for backward compatibility
    for (const [symbol, priceData] of this.priceBatchBuffer) {
      this.priceGateway.broadcastPrice(symbol, priceData);
    }
    // 일괄 이벤트로도 전송 — 클라이언트가 배치 수신 최적화 가능
    // Batch event — clients can optimize by handling batch updates
    this.priceGateway.broadcastPriceBatch(
      Array.from(this.priceBatchBuffer.entries()).map(([symbol, data]) => ({ symbol, data })),
    );
    this.priceBatchBuffer.clear();
  }

  /** Redis 구독 해제 및 알림 갱신 인터벌 정리
   * Unsubscribe from Redis and clear alert refresh interval */
  async onModuleDestroy() {
    if (this.batchFlushTimer) {
      clearTimeout(this.batchFlushTimer);
    }
    // 종료 전 남은 배치 플러시 / Flush remaining batch before shutdown
    this.flushPriceBatch();
    if (this.alertRefreshInterval) {
      clearInterval(this.alertRefreshInterval);
    }
    if (this.alertRefreshTimeout) {
      clearTimeout(this.alertRefreshTimeout);
    }
    if (this.subscriber) {
      await this.subscriber.punsubscribe();
      await this.subscriber.quit();
    }
  }

  /**
   * 다음 알림 갱신을 스케줄 — 연속 실패 시 지수 백오프 적용 (M-09)
   * Schedule next alert refresh — exponential backoff on consecutive failures
   */
  private scheduleNextRefresh() {
    const delay = this.consecutiveFailures === 0
      ? PriceSubscriberService.BASE_INTERVAL_MS
      : Math.min(
          PriceSubscriberService.BASE_INTERVAL_MS * Math.pow(2, this.consecutiveFailures),
          PriceSubscriberService.MAX_BACKOFF_MS,
        );

    this.alertRefreshTimeout = setTimeout(() => {
      this.refreshAlerts()
        .catch((e) => this.logger.warn('refreshAlerts failed', e.message))
        .finally(() => this.scheduleNextRefresh());
    }, delay);
  }

  /** 활성 가격 알림을 user-auth에서 조회하여 로컬 캐시 갱신
   * Fetch active price alerts from user-auth and refresh local cache */
  private async refreshAlerts() {
    try {
      const res = await axios.get(`${this.userAuthUrl}/price-alerts/active`, {
        timeout: 5000,
        headers: { 'x-internal-token': this.internalToken },
      });
      const items: CachedAlert[] = (res.data?.data?.items || []).map((a: any) => ({
        id: a.id,
        userId: a.userId,
        symbol: a.symbol,
        targetPrice: Number(a.targetPrice),
        condition: a.condition,
        currency: a.currency || 'USD',
        displayTargetPrice: a.displayTargetPrice ? Number(a.displayTargetPrice) : null,
      }));

      const bySymbol = new Map<string, CachedAlert[]>();
      for (const alert of items) {
        if (!bySymbol.has(alert.symbol)) bySymbol.set(alert.symbol, []);
        bySymbol.get(alert.symbol)!.push(alert);
      }
      this.alertsBySymbol = bySymbol;
      // 성공 시 실패 카운터 리셋 (Reset failure counter on success)
      this.consecutiveFailures = 0;
    } catch (e) {
      this.consecutiveFailures++;
      const nextDelay = Math.min(
        PriceSubscriberService.BASE_INTERVAL_MS * Math.pow(2, this.consecutiveFailures),
        PriceSubscriberService.MAX_BACKOFF_MS,
      );
      this.logger.warn(
        `refreshAlerts failed (attempt ${this.consecutiveFailures}, next retry in ${Math.round(nextDelay / 1000)}s)`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  /** 현재가로 가격 알림 조건 충족 여부를 확인하고 트리거 처리 — 심볼당 초당 1회 제한
   * Check if current price meets alert conditions and process triggers — throttled to once/sec/symbol */
  private checkPriceAlerts(symbol: string, price: number) {
    const alerts = this.alertsBySymbol.get(symbol);
    if (!alerts || alerts.length === 0) return;

    // 심볼당 초당 1회로 제한 — 매 틱마다 확인하면 CPU 낭비
    // Throttle to once per second per symbol — checking every tick wastes CPU
    const now = Date.now();
    const lastCheck = this.lastAlertCheckBySymbol.get(symbol) || 0;
    if (now - lastCheck < 1000) return;
    this.lastAlertCheckBySymbol.set(symbol, now);

    const triggered: CachedAlert[] = [];
    const remaining: CachedAlert[] = [];

    for (const alert of alerts) {
      const met =
        (alert.condition === 'ABOVE' && price >= alert.targetPrice) ||
        (alert.condition === 'BELOW' && price <= alert.targetPrice);
      if (met) {
        triggered.push(alert);
      } else {
        remaining.push(alert);
      }
    }

    if (triggered.length === 0) return;

    // 중복 트리거 방지를 위해 로컬 캐시 즉시 갱신 (Update local cache immediately to prevent duplicate triggers)
    if (remaining.length > 0) {
      this.alertsBySymbol.set(symbol, remaining);
    } else {
      this.alertsBySymbol.delete(symbol);
    }

    // 트리거된 알림을 비동기로 처리 — DB 성공 후에만 확정 (Process triggered alerts — only finalize after DB success)
    for (const alert of triggered) {
      this.handleTriggeredAlert(alert, price).catch((e) => {
        this.logger.warn(`handleTriggeredAlert failed for ${alert.id}, re-adding to cache`, e.message);
        // DB 실패 시 캐시에 복원하여 재시도 가능하게 (Restore to cache on failure for retry)
        const existing = this.alertsBySymbol.get(symbol) || [];
        existing.push(alert);
        this.alertsBySymbol.set(symbol, existing);
      });
    }
  }

  /** 통화에 따라 가격을 포맷팅 (KRW: 원, USD: 달러)
   * Format price by currency (KRW: won, USD: dollar) */
  private formatPrice(price: number, currency: string): string {
    if (currency === 'KRW') {
      return `₩${Math.round(price).toLocaleString()}`;
    }
    return `$${price.toFixed(2)}`;
  }

  /** 트리거된 가격 알림을 DB에 기록하고 WebSocket으로 사용자에게 알림 전송
   * Persist triggered alert to DB and notify user via WebSocket */
  private async handleTriggeredAlert(alert: CachedAlert, currentPrice: number) {
    try {
      const condLabel = alert.condition === 'ABOVE' ? '↑' : '↓';
      const displayPrice = alert.displayTargetPrice ?? alert.targetPrice;
      const title = `${alert.symbol} ${condLabel} ${this.formatPrice(displayPrice, alert.currency)}`;
      const message = `Current: ${this.formatPrice(
        alert.currency === 'KRW' && alert.displayTargetPrice
          ? currentPrice * (alert.displayTargetPrice / alert.targetPrice)
          : currentPrice,
        alert.currency,
      )}`;

      // 알림을 트리거 완료로 표시 (Mark alert as triggered)
      await axios.post(`${this.userAuthUrl}/price-alerts/${alert.id}/trigger`, {}, {
        timeout: 5000,
        headers: { 'x-internal-token': this.internalToken },
      });

      // WebSocket 알림 전송 (Send WebSocket notification)
      this.chatGateway.notifyUser(alert.userId, 'notification:price-alert', {
        type: 'PRICE_ALERT',
        title,
        message,
        symbol: alert.symbol,
        targetPrice: alert.targetPrice,
        currentPrice,
        timestamp: new Date().toISOString(),
      });

      // 알림을 DB에 영구 저장 — 실패 시 최대 2회 재시도 (지수 백오프)
      // Persist notification to DB — retry up to 2 times on failure (exponential backoff)
      const notificationPayload = {
        userId: alert.userId,
        type: 'PRICE_ALERT',
        title,
        message,
        link: `/asset/${alert.symbol}`,
      };
      let notifSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await axios.post(
            `${this.userAuthUrl}/notifications`,
            notificationPayload,
            {
              timeout: 5000,
              headers: { 'x-internal-token': this.internalToken },
            },
          );
          notifSaved = true;
          break;
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          if (attempt < 3) {
            // 재시도 전 지수 백오프 대기 / Exponential backoff before retry
            await new Promise((r) => setTimeout(r, attempt * 500));
            this.logger.warn(`Notification persist attempt ${attempt}/3 failed for alert ${alert.id}, retrying: ${errMsg}`);
          } else {
            // 최종 실패 — ERROR 레벨로 기록하여 모니터링 대시보드에서 감지 가능하도록 함
            // Final failure — log at ERROR level so monitoring dashboards can detect it
            this.logger.error(`Failed to persist notification for alert ${alert.id} after 3 attempts: ${errMsg}`);
          }
        }
      }

      this.logger.log(`Price alert triggered: ${alert.symbol} ${alert.condition} ${alert.targetPrice} for user ${alert.userId} (notifSaved=${notifSaved})`);
    } catch (error) {
      // 가격 알림 처리 전체 실패 — ERROR 레벨로 기록 (알림 ID, 심볼, 사용자 ID 포함)
      // Full alert handling failure — log at ERROR level (with alert ID, symbol, user ID)
      this.logger.error(
        `Failed to handle triggered alert ${alert.id} (symbol=${alert.symbol}, userId=${alert.userId})`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
