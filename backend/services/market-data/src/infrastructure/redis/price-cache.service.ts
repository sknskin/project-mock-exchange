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
}
