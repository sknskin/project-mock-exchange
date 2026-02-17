import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@mock-exchange/common';
import { PriceTick } from '../../domain/entities/asset.entity';

@Injectable()
export class PriceProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceProducerService.name);
  private producer: Producer;
  private connected = false;

  constructor(private readonly configService: ConfigService) {
    const kafka = new Kafka({
      clientId: 'market-data-service',
      brokers: this.configService
        .get<string>('KAFKA_BROKERS', 'localhost:9092')
        .split(','),
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });
    this.producer = kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.connected = true;
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.warn('Kafka not available, running without event publishing', error);
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.producer.disconnect();
    }
  }

  async publishPriceUpdate(tick: PriceTick): Promise<void> {
    if (!this.connected) return;

    try {
      await this.producer.send({
        topic: KAFKA_TOPICS.MARKET_PRICES_UPDATED,
        messages: [
          {
            key: tick.symbol,
            value: JSON.stringify({
              symbol: tick.symbol,
              price: tick.price.toString(),
              bid: tick.bid.toString(),
              ask: tick.ask.toString(),
              volume: tick.volume.toString(),
              change24h: tick.change24h.toString(),
              changePercent24h: tick.changePercent24h.toString(),
              timestamp: tick.timestamp.toISOString(),
            }),
          },
        ],
      });
    } catch (error) {
      this.logger.error(`Failed to publish price for ${tick.symbol}`, error);
    }
  }
}
