/**
 * @file 가격 구독 서비스
 * @description Redis PubSub으로 실시간 가격 업데이트를 구독하여 WebSocket으로 전달합니다
 *
 * @file Price Subscriber Service
 * @description Subscribes to real-time price updates via Redis PubSub and forwards to WebSocket
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PriceGateway } from './price.gateway';

@Injectable()
export class PriceSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceSubscriberService.name);
  private subscriber: Redis;
  private readonly symbols: string[] = [
    'BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD',
    'AAPL', 'GOOGL', 'TSLA', 'MSFT', 'NVDA',
    'ADA-USD', 'DOT-USD', 'AVAX-USD', 'LINK-USD', 'MATIC-USD',
    'AMZN', 'META', 'NFLX', 'AMD', 'INTC',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly priceGateway: PriceGateway,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.subscriber = new Redis(redisUrl);
    this.subscriber.on('error', (err) => this.logger.error('Redis subscriber error', err));

    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        const priceData = JSON.parse(message);
        const symbol = channel.replace('prices:', '');
        this.priceGateway.broadcastPrice(symbol, priceData);
      } catch (err) {
        this.logger.error(`Failed to parse price message: ${err}`);
      }
    });

    for (const symbol of this.symbols) {
      await this.subscriber.subscribe(`prices:${symbol}`);
    }

    this.logger.log(`Subscribed to ${this.symbols.length} price channels via Redis PubSub`);
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe();
      await this.subscriber.quit();
    }
  }
}
