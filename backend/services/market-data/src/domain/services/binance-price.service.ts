/**
 * @file Binance 실시간 가격 서비스
 * @description Binance WebSocket Combined Stream을 통해 암호화폐 실시간 시세를 수신합니다
 *
 * @file Binance Real-time Price Service
 * @description Receives live crypto prices via Binance WebSocket Combined Stream
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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

  private handleTickerMessage(data: any) {
    // Binance 24hr ticker payload:
    // s: symbol, c: last price, b: best bid, a: best ask
    // v: 24h volume, p: price change, P: price change %
    // h: 24h high, l: 24h low
    const binanceSymbol = (data.s as string)?.toLowerCase();
    if (!binanceSymbol) return;

    const internalSymbol = BINANCE_REVERSE_MAP.get(binanceSymbol);
    if (!internalSymbol) return;

    const tick: PriceTick = {
      symbol: internalSymbol,
      price: parseFloat(data.c),
      bid: parseFloat(data.b),
      ask: parseFloat(data.a),
      volume: parseFloat(data.v),
      change24h: parseFloat(data.p),
      changePercent24h: parseFloat(data.P),
      high24h: parseFloat(data.h),
      low24h: parseFloat(data.l),
      timestamp: new Date(),
    };

    this.cache.set(binanceSymbol, { tick, receivedAt: Date.now() });
  }

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
