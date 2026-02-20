/**
 * @file 시장 데이터 애플리케이션 서비스
 * @description 가격 조회, 캔들스틱, 기간별 등락률 등 시장 데이터 유스케이스를 처리합니다
 *
 * @file Market Data Application Service
 * @description Handles market data use cases: price queries, candlesticks, period changes
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PriceEngineService } from '../../domain/services/price-engine.service';
import { BinancePriceService } from '../../domain/services/binance-price.service';
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
    private readonly binancePrice: BinancePriceService,
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
   * 5분마다 DB에서 자산 목록을 갱신합니다.
   * 서비스 재시작 없이 새로 추가된 자산을 반영합니다.
   *
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
   * 모든 자산에 대해 매초 가격 틱을 생성합니다.
   *
   * Generate price ticks every second for all assets.
   */
  @Interval(1000)
  async generatePriceTicks() {
    this.tickCount++;
    const ticks: PriceTick[] = [];

    for (const asset of this.assets) {
      let tick: PriceTick;

      if (asset.assetType === 'CRYPTO') {
        const binanceTick = this.binancePrice.getLatestTick(asset.symbol);
        if (binanceTick) {
          tick = binanceTick;
          this.priceEngine.updateFromExternal(asset.symbol, tick);
        } else {
          tick = this.priceEngine.generateTick(asset);
        }
      } else {
        tick = this.priceEngine.generateTick(asset);
      }

      ticks.push(tick);
    }

    // Redis 파이프라인으로 일괄 SET + PUBLISH (2N 연산을 1회 왕복으로) / Batch SET + PUBLISH via Redis pipeline
    await this.priceCache.setPricesBatch(ticks);

    // Kafka에 백그라운드 발행 (논블로킹) / Publish to Kafka in background (non-blocking)
    for (const tick of ticks) {
      this.priceProducer.publishPriceUpdate(tick).catch(() => {});
    }

    // 10틱(10초)마다 DB 저장으로 쓰기 부하 감소 / Persist to DB every 10 ticks (10 seconds) to reduce write pressure
    if (this.tickCount % 10 === 0) {
      await this.persistPrices(ticks);
    }

    // 60틱(1분)마다 캔들스틱 갱신 / Update candlesticks every 60 ticks (1 minute)
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

  /**
   * 기간별 등락률을 계산합니다.
   * 1) DB에 해당 기간의 실제 가격 이력이 있으면 실측 데이터 사용
   * 2) 이력이 없으면 현실적 범위 내에서 시뮬레이션
   * tanh로 부드럽게 바운딩하여 비현실적 극단값을 방지하고,
   * 기간별로 다른 시드 오프셋을 사용해 순위가 의미 있게 변동되도록 합니다.
   *
   * Calculates period changes.
   * 1) Uses actual DB price history when available
   * 2) Falls back to realistic bounded simulation
   * Uses tanh for smooth bounding and per-period seed offsets for meaningful rank changes.
   */
  async getPeriodChanges(period: string) {
    const periodDays: Record<string, number> = {
      '1d': 1,
      '1w': 7,
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
    };

    const days = periodDays[period];
    if (!days) {
      return [];
    }

    const currentPrices = await this.getLatestPrices();
    if (currentPrices.length === 0) return [];

    const assetConfigMap = new Map<string, AssetConfig>();
    for (const asset of this.assets) {
      assetConfigMap.set(asset.symbol, asset);
    }

    // DB에서 기간 시작 시점의 가격을 일괄 조회 (±1시간 허용)
    // Batch query for historical prices at period start (±1h tolerance)
    const targetDate = new Date(Date.now() - days * 86400000);
    const windowStart = new Date(targetDate.getTime() - 3600000);
    const windowEnd = new Date(targetDate.getTime() + 3600000);

    const historicalPrices = await this.prisma.priceHistory.findMany({
      where: {
        timestamp: { gte: windowStart, lte: windowEnd },
      },
      distinct: ['symbol'],
      orderBy: { timestamp: 'asc' },
    });

    const historyMap = new Map<string, number>();
    for (const h of historicalPrices) {
      historyMap.set(h.symbol, Number(h.price));
    }

    // 기간별 최대 변동률 (%) / Max change percent per period
    const maxPct: Record<string, { crypto: number; stock: number }> = {
      '1d': { crypto: 8, stock: 4 },
      '1w': { crypto: 15, stock: 8 },
      '1m': { crypto: 25, stock: 15 },
      '3m': { crypto: 40, stock: 25 },
      '6m': { crypto: 55, stock: 35 },
      '1y': { crypto: 80, stock: 50 },
    };

    // 기간별 시드 오프셋으로 순위 변동 보장 / Seed offset per period for meaningful rank changes
    const periodOffset: Record<string, number> = {
      '1d': 17, '1w': 53, '1m': 97, '3m': 149, '6m': 211, '1y': 277,
    };

    const today = new Date().toISOString().slice(0, 10);

    return currentPrices.map((tick) => {
      // 1) DB 실측 데이터 우선 / Prefer actual DB data
      const histPrice = historyMap.get(tick.symbol);
      if (histPrice && histPrice > 0) {
        const changeAmount = tick.price - histPrice;
        const changePercent = ((tick.price - histPrice) / histPrice) * 100;
        return {
          symbol: tick.symbol,
          currentPrice: tick.price,
          basePrice: histPrice,
          changeAmount,
          changePercent: Math.round(changePercent * 100) / 100,
        };
      }

      // 2) 시뮬레이션 폴백: 현실적 범위로 제한 / Simulation fallback: bounded to realistic range
      const config = assetConfigMap.get(tick.symbol);
      const isCrypto = config?.assetType === 'CRYPTO';
      const cap = maxPct[period]?.[isCrypto ? 'crypto' : 'stock'] ?? 30;
      const offset = periodOffset[period] ?? 0;

      const seed = this.hashString(`${tick.symbol}:${period}:${today}`) + offset;
      const random = this.seededGaussian(seed);

      // tanh로 부드럽게 ±cap% 범위로 바운딩 / Smooth bounding via tanh
      const changePct = Math.tanh(random * 0.6) * cap;
      const basePrice = tick.price / (1 + changePct / 100);
      const changeAmount = tick.price - basePrice;

      return {
        symbol: tick.symbol,
        currentPrice: tick.price,
        basePrice: Math.max(basePrice, 0.0001),
        changeAmount,
        changePercent: Math.round(changePct * 100) / 100,
      };
    });
  }

  /**
   * 문자열을 32비트 정수 해시로 변환 (djb2 알고리즘)
   * Convert string to 32-bit integer hash (djb2 algorithm)
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  /**
   * 시드 기반 가우시안 난수 생성 (Box-Muller 변환)
   * Seeded Gaussian random using Box-Muller transform
   */
  private seededGaussian(seed: number): number {
    // 간단한 xorshift로 0~1 사이 유니폼 난수 2개 생성
    // Simple xorshift to generate two uniform random numbers in [0,1]
    let s = seed;
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    const u1 = (Math.abs(s) % 10000) / 10000 || 0.0001;
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    const u2 = (Math.abs(s) % 10000) / 10000 || 0.0001;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
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
