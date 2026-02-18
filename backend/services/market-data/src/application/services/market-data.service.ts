import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PriceEngineService } from '../../domain/services/price-engine.service';
import { PriceCacheService } from '../../infrastructure/redis/price-cache.service';
import { PriceProducerService } from '../../infrastructure/kafka/price-producer.service';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { AssetConfig, DEFAULT_ASSETS, PriceTick } from '../../domain/entities/asset.entity';

@Injectable()
export class MarketDataService implements OnModuleInit {
  private readonly logger = new Logger(MarketDataService.name);
  private assets: AssetConfig[] = [];
  private assetSymbols = new Set<string>();
  private tickCount = 0;

  constructor(
    private readonly priceEngine: PriceEngineService,
    private readonly priceCache: PriceCacheService,
    private readonly priceProducer: PriceProducerService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.seedAssets();
  }

  private async seedAssets() {
    for (const asset of DEFAULT_ASSETS) {
      await this.prisma.asset.upsert({
        where: { symbol: asset.symbol },
        create: {
          symbol: asset.symbol,
          name: asset.name,
          assetType: asset.assetType,
          basePrice: asset.basePrice,
        },
        update: {},
      });
      this.priceEngine.initializeAsset(asset);
      this.assets.push(asset);
      this.assetSymbols.add(asset.symbol);
    }
    this.logger.log(`Seeded ${this.assets.length} assets`);
  }

  /**
   * Refresh assets from DB every 5 minutes.
   * Picks up newly added assets without requiring a service restart.
   */
  @Interval(300_000)
  async refreshAssetsFromDb() {
    try {
      const dbAssets = await this.prisma.asset.findMany({
        where: { isActive: true },
      });

      let newCount = 0;
      for (const dbAsset of dbAssets) {
        if (!this.assetSymbols.has(dbAsset.symbol)) {
          const config: AssetConfig = {
            symbol: dbAsset.symbol,
            name: dbAsset.name,
            assetType: dbAsset.assetType as AssetConfig['assetType'],
            basePrice: Number(dbAsset.basePrice),
            volatility: 0.5,
            spreadBps: 15,
          };
          this.priceEngine.initializeAsset(config);
          this.assets.push(config);
          this.assetSymbols.add(dbAsset.symbol);
          newCount++;
        }
      }

      if (newCount > 0) {
        this.logger.log(`Loaded ${newCount} new assets from DB (total: ${this.assets.length})`);
      }
    } catch (error) {
      this.logger.error('Failed to refresh assets from DB', error);
    }
  }

  /**
   * Generate price ticks every second for all assets.
   */
  @Interval(1000)
  async generatePriceTicks() {
    this.tickCount++;
    const ticks: PriceTick[] = [];

    for (const asset of this.assets) {
      const tick = this.priceEngine.generateTick(asset);
      ticks.push(tick);
    }

    // Batch SET + PUBLISH via Redis pipeline (2N ops in 1 round-trip)
    await this.priceCache.setPricesBatch(ticks);

    // Publish to Kafka in background (non-blocking)
    for (const tick of ticks) {
      this.priceProducer.publishPriceUpdate(tick).catch(() => {});
    }

    // Persist to DB every 10 ticks (10 seconds) to reduce write pressure
    if (this.tickCount % 10 === 0) {
      await this.persistPrices(ticks);
    }

    // Update candlesticks every 60 ticks (1 minute)
    if (this.tickCount % 60 === 0) {
      await this.updateCandlesticks(ticks);
    }
  }

  async getLatestPrices(): Promise<PriceTick[]> {
    const symbols = this.assets.map((a) => a.symbol);
    const cached = await this.priceCache.getAllPrices(symbols);

    const result: PriceTick[] = [];
    for (const symbol of symbols) {
      const tick = cached.get(symbol);
      if (tick) {
        result.push(tick);
      }
    }
    return result;
  }

  async getPrice(symbol: string): Promise<PriceTick | null> {
    return this.priceCache.getPrice(symbol);
  }

  async getAssets() {
    return this.prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' },
    });
  }

  async getPriceHistory(symbol: string, limit = 100) {
    return this.prisma.priceHistory.findMany({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getCandlesticks(symbol: string, interval: string, limit = 100) {
    return this.prisma.candlestick.findMany({
      where: { symbol, interval },
      orderBy: { openTime: 'desc' },
      take: limit,
    });
  }

  private async persistPrices(ticks: PriceTick[]) {
    try {
      await this.prisma.priceHistory.createMany({
        data: ticks.map((t) => ({
          symbol: t.symbol,
          price: t.price,
          bid: t.bid,
          ask: t.ask,
          volume: t.volume,
          timestamp: t.timestamp,
        })),
      });
    } catch (error) {
      this.logger.error('Failed to persist prices', error);
    }
  }

  private async updateCandlesticks(ticks: PriceTick[]) {
    const now = new Date();
    const minuteStart = new Date(now);
    minuteStart.setSeconds(0, 0);
    const minuteEnd = new Date(minuteStart.getTime() + 60000);

    for (const tick of ticks) {
      try {
        await this.prisma.candlestick.upsert({
          where: {
            symbol_interval_openTime: {
              symbol: tick.symbol,
              interval: '1m',
              openTime: minuteStart,
            },
          },
          create: {
            symbol: tick.symbol,
            interval: '1m',
            openPrice: tick.price,
            highPrice: tick.price,
            lowPrice: tick.price,
            closePrice: tick.price,
            volume: tick.volume,
            openTime: minuteStart,
            closeTime: minuteEnd,
          },
          update: {
            closePrice: tick.price,
            highPrice: { set: tick.high24h },
            lowPrice: { set: tick.low24h },
            volume: tick.volume,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to update candlestick for ${tick.symbol}`, error);
      }
    }
  }
}
