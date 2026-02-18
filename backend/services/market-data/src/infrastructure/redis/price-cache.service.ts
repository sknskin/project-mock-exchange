/**
 * @file 가격 캐시 서비스
 * @description Redis에 최신 가격을 캐싱하고 PubSub으로 실시간 가격을 발행합니다
 *
 * @file Price Cache Service
 * @description Caches latest prices in Redis and publishes real-time prices via PubSub
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PriceTick } from '../../domain/entities/asset.entity';

@Injectable()
export class PriceCacheService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(PriceCacheService.name);

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(
      this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
    );
    this.redis.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async setPrice(tick: PriceTick): Promise<void> {
    const key = `market:price:${tick.symbol}`;
    await this.redis.set(key, JSON.stringify(tick), 'EX', 10);
  }

  async getPrice(symbol: string): Promise<PriceTick | null> {
    const data = await this.redis.get(`market:price:${symbol}`);
    return data ? JSON.parse(data) : null;
  }

  async getAllPrices(symbols: string[]): Promise<Map<string, PriceTick>> {
    const result = new Map<string, PriceTick>();
    if (symbols.length === 0) return result;

    const keys = symbols.map((s) => `market:price:${s}`);
    const values = await this.redis.mget(...keys);

    values.forEach((val, i) => {
      if (val) {
        result.set(symbols[i], JSON.parse(val));
      }
    });

    return result;
  }

  async publishPrice(tick: PriceTick): Promise<void> {
    await this.redis.publish(
      `prices:${tick.symbol}`,
      JSON.stringify(tick),
    );
  }

  /**
   * Batch SET + PUBLISH using Redis pipeline.
   * Reduces 2N sequential calls to 1 pipelined batch.
   */
  async setPricesBatch(ticks: PriceTick[]): Promise<void> {
    if (ticks.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const tick of ticks) {
      const key = `market:price:${tick.symbol}`;
      const json = JSON.stringify(tick);
      pipeline.set(key, json, 'EX', 10);
      pipeline.publish(`prices:${tick.symbol}`, json);
    }
    await pipeline.exec();
  }
}
