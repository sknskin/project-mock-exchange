/**
 * @file Binance 실시간 가격 서비스
 * @description Binance WebSocket Combined Stream을 통해 암호화폐 실시간 시세를 수신합니다
 *
 * @file Binance Real-time Price Service
 * @description Receives live crypto prices via Binance WebSocket Combined Stream
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import WebSocket from 'ws';
import {
  PriceTick,
  BINANCE_SYMBOL_MAP,
  BINANCE_REVERSE_MAP,
} from '../entities/asset.entity';

@Injectable()
export class BinancePriceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BinancePriceService.name);
  private ws: WebSocket | null = null;
  private cache = new Map<string, { tick: PriceTick; receivedAt: number }>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 5000;
  private readonly MAX_RECONNECT_DELAY = 30_000;
  private readonly STALE_THRESHOLD_MS = 10_000;
  /** C-05: 캐시에서 오래된 항목을 제거하는 주기 (30초)
   * C-05: Interval for removing stale cache entries (30 seconds) */
  private readonly STALE_CLEANUP_MS = 30_000;
  private isShuttingDown = false;

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    this.disconnect();
  }

  /**
   * 특정 심볼의 최신 Binance 데이터를 반환합니다 (10초 이내).
   * stale이면 null → GBM 폴백.
   *
   * Returns latest Binance data for a symbol (within 10s).
   * Returns null if stale → GBM fallback.
   */
  getLatestTick(internalSymbol: string): PriceTick | null {
    const binanceSymbol = BINANCE_SYMBOL_MAP.get(internalSymbol);
    if (!binanceSymbol) return null;
    const entry = this.cache.get(binanceSymbol);
    if (!entry || Date.now() - entry.receivedAt > this.STALE_THRESHOLD_MS) {
      return null;
    }
    return entry.tick;
  }

  /**
   * C-05: 30초마다 캐시에서 오래된(stale) 항목을 제거합니다.
   * 심볼 수에 의해 자연적으로 바운드되지만, WebSocket 연결 끊김 시
   * 오래된 데이터가 남아있는 것을 방지합니다.
   *
   * C-05: Periodically remove stale entries from cache every 30 seconds.
   * Cache is naturally bounded by symbol count, but this prevents stale data
   * from lingering after WebSocket disconnections.
   */
  @Interval(30_000)
  cleanupStaleEntries() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache) {
      if (now - entry.receivedAt > this.STALE_CLEANUP_MS) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} stale cache entries`);
    }
  }

  /** Binance WebSocket Combined Stream에 연결합니다
   * Connect to Binance WebSocket Combined Stream */
  private connect() {
    if (BINANCE_SYMBOL_MAP.size === 0) {
      this.logger.warn('No Binance symbols configured, skipping connection');
      return;
    }

    const streams = [...BINANCE_SYMBOL_MAP.values()]
      .map((s) => `${s}@ticker`)
      .join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    this.logger.log(
      `Connecting to Binance WebSocket (${BINANCE_SYMBOL_MAP.size} symbols)...`,
    );

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.logger.log('Binance WebSocket connected');
        this.reconnectDelay = 5000;
      });

      this.ws.on('message', (raw: WebSocket.Data) => {
        try {
          const message = JSON.parse(raw.toString());
          if (message.data) {
            this.handleTickerMessage(message.data);
          }
        } catch {
          // 파싱 실패 무시 / Ignore parse failures
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        this.logger.warn(
          `Binance WebSocket closed (code=${code}, reason=${reason.toString()})`,
        );
        this.scheduleReconnect();
      });

      this.ws.on('error', (err: Error) => {
        this.logger.error(`Binance WebSocket error: ${err.message}`);
      });
    } catch (err) {
      this.logger.error(`Failed to create Binance WebSocket: ${err}`);
      this.scheduleReconnect();
    }
  }

  /** Binance 24시간 티커 메시지를 파싱하여 캐시에 저장합니다
   * Parse Binance 24hr ticker message and store in cache */
  private handleTickerMessage(data: Record<string, unknown>) {
    // Binance 24시간 티커 데이터 (Binance 24hr ticker payload):
    // s: 심볼(symbol), c: 최종가(last price), b: 최우선 매수호가(best bid), a: 최우선 매도호가(best ask)
    // v: 24시간 거래량(24h volume), p: 가격 변동(price change), P: 가격 변동률(price change %)
    // h: 24시간 고가(24h high), l: 24시간 저가(24h low)
    if (typeof data.s !== 'string' || typeof data.c !== 'string') return;
    const binanceSymbol = data.s.toLowerCase();
    if (!binanceSymbol) return;

    const internalSymbol = BINANCE_REVERSE_MAP.get(binanceSymbol);
    if (!internalSymbol) return;

    // H-05: parseFloat은 IEEE-754 배정밀도(~15-17 유효자릿수)를 사용합니다.
    // Binance 가격은 일반적으로 8자리 이하 소수점이므로 정밀도 손실 없음.
    // 정밀 계산이 필요한 경우(예: 주문 매칭) Decimal 라이브러리 사용을 고려해야 합니다.
    //
    // H-05: parseFloat uses IEEE-754 double precision (~15-17 significant digits).
    // Binance prices typically have <=8 decimal places, so no precision loss here.
    // For precision-critical operations (e.g., order matching), consider a Decimal library.
    const tick: PriceTick = {
      symbol: internalSymbol,
      price: parseFloat(data.c as string),
      bid: parseFloat((data.b as string) || '0'),
      ask: parseFloat((data.a as string) || '0'),
      volume: parseFloat((data.v as string) || '0'),
      change24h: parseFloat((data.p as string) || '0'),
      changePercent24h: parseFloat((data.P as string) || '0'),
      high24h: parseFloat((data.h as string) || '0'),
      low24h: parseFloat((data.l as string) || '0'),
      timestamp: new Date(),
    };

    this.cache.set(binanceSymbol, { tick, receivedAt: Date.now() });
  }

  /** 지수 백오프로 WebSocket 재연결을 예약합니다
   * Schedule WebSocket reconnection with exponential backoff */
  private scheduleReconnect() {
    if (this.isShuttingDown) return;
    if (this.reconnectTimeout) return;

    this.logger.log(
      `Scheduling Binance reconnect in ${this.reconnectDelay / 1000}s...`,
    );
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.reconnectDelay);

    // 지수 백오프 (최대 30초) / Exponential backoff (max 30s)
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.MAX_RECONNECT_DELAY,
    );
  }

  /** WebSocket 연결을 종료하고 리소스를 정리합니다
   * Close WebSocket connection and clean up resources */
  private disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
  }
}
