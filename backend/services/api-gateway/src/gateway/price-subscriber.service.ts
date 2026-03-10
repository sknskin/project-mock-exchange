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
  private alertRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly userAuthUrl: string;
  private readonly internalToken: string;

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

    // 패턴 구독으로 모든 종목의 가격 채널을 한 번에 구독
    // Pattern subscribe to all price channels at once
    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      try {
        const priceData = JSON.parse(message);
        const symbol = channel.replace('prices:', '');
        this.priceGateway.broadcastPrice(symbol, priceData);
        this.checkPriceAlerts(symbol, priceData.price);
      } catch (err) {
        this.logger.error(`Failed to parse price message: ${err}`);
      }
    });

    await this.subscriber.psubscribe('prices:*');

    this.logger.log('Subscribed to all price channels via Redis PSUBSCRIBE prices:*');

    // 시작 시 알림 로드 후 30초마다 갱신 (Load alerts on startup and refresh every 30 seconds)
    this.refreshAlerts().catch((e) => this.logger.warn('Initial refreshAlerts failed', e.message));
    this.alertRefreshInterval = setInterval(() => {
      this.refreshAlerts().catch((e) => this.logger.warn('refreshAlerts failed', e.message));
    }, 30_000);
  }

  /** Redis 구독 해제 및 알림 갱신 인터벌 정리
   * Unsubscribe from Redis and clear alert refresh interval */
  async onModuleDestroy() {
    if (this.alertRefreshInterval) {
      clearInterval(this.alertRefreshInterval);
    }
    if (this.subscriber) {
      await this.subscriber.punsubscribe();
      await this.subscriber.quit();
    }
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
    } catch (e) {
      this.logger.warn('refreshAlerts failed', e instanceof Error ? e.message : e);
    }
  }

  /** 현재가로 가격 알림 조건 충족 여부를 확인하고 트리거 처리
   * Check if current price meets alert conditions and process triggers */
  private checkPriceAlerts(symbol: string, price: number) {
    const alerts = this.alertsBySymbol.get(symbol);
    if (!alerts || alerts.length === 0) return;

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

      // 알림을 DB에 영구 저장 (Persist notification to DB)
      await axios.post(
        `${this.userAuthUrl}/notifications`,
        {
          userId: alert.userId,
          type: 'PRICE_ALERT',
          title,
          message,
          link: `/asset/${alert.symbol}`,
        },
        {
          timeout: 5000,
          headers: { 'x-internal-token': this.internalToken },
        },
      ).catch((e) => this.logger.warn(`Failed to persist notification for alert ${alert.id}`, e.message));

      this.logger.log(`Price alert triggered: ${alert.symbol} ${alert.condition} ${alert.targetPrice} for user ${alert.userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle triggered alert ${alert.id}`, error);
    }
  }
}
