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
   * 기간별 등락률을 시뮬레이션합니다.
   * 모의 거래소이므로 실제 이력 대신 변동성(σ) 기반으로 기간별 기준가를 역산합니다.
   * 금융 표준: σ_period = σ_annual × √(periodDays / 365)
   * 결정론적 시드(심볼 해시 + 기간 + 날짜)로 같은 날 같은 요청에 동일한 결과를 보장합니다.
   *
   * Simulates period changes using volatility-based base price estimation.
   * Uses deterministic seed (symbol hash + period + date) for stable results within the same day.
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

    // 오늘 날짜를 시드에 포함 → 하루 동안 안정적, 다음 날 새 값
    // Include today's date in seed → stable for a day, new values next day
    const today = new Date().toISOString().slice(0, 10);

    return currentPrices.map((tick) => {
      const config = assetConfigMap.get(tick.symbol);
      const annualVol = config?.volatility ?? 0.5;

      // 기간별 변동성 스케일링: σ_period = σ_annual × √(days / 365)
      // Period volatility scaling: σ_period = σ_annual × √(days / 365)
      const periodVol = annualVol * Math.sqrt(days / 365);

      // 결정론적 의사난수 생성 / Deterministic pseudo-random number
      const seed = this.hashString(`${tick.symbol}:${period}:${today}`);
      const random = this.seededGaussian(seed);

      // 기준가 역산: basePrice = currentPrice / (1 + change)
      // change는 N(0, periodVol) 분포를 따름
      // Estimate base price: basePrice = currentPrice / (1 + change)
      // change follows N(0, periodVol) distribution
      const change = random * periodVol;
      const basePrice = tick.price / (1 + change);
      const changeAmount = tick.price - basePrice;
      const changePercent = (change) * 100;

      return {
        symbol: tick.symbol,
        currentPrice: tick.price,
        basePrice: Math.max(basePrice, 0.0001),
        changeAmount,
        changePercent: Math.round(changePercent * 100) / 100,
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
