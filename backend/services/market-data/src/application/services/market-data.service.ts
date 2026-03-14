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
import { AssetConfig, DEFAULT_ASSETS, PriceTick, BINANCE_SYMBOL_MAP } from '../../domain/entities/asset.entity';

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

  /** 기본 자산 목록을 DB에 시드하고 가격 엔진을 초기화합니다
   * Seed default assets into DB and initialize price engine */
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

      // 비활성화된 자산을 메모리에서 제거 — 메모리 누적 방지
      // Remove deactivated assets from memory — prevents gradual memory growth
      const activeSymbols = new Set(dbAssets.map((a) => a.symbol));
      const removedCount = this.assets.length;
      this.assets = this.assets.filter((a) => activeSymbols.has(a.symbol));
      const removedDiff = removedCount - this.assets.length;
      for (const sym of [...this.assetSymbols]) {
        if (!activeSymbols.has(sym)) this.assetSymbols.delete(sym);
      }

      if (newCount > 0 || removedDiff > 0) {
        // 자산 갱신 결과를 DEBUG 레벨로 기록 — 5분마다 반복되므로 INFO 레벨에서는 로그 노이즈 발생
        // Log asset refresh at DEBUG level — runs every 5 min, INFO would be too noisy
        this.logger.debug(`Asset refresh: +${newCount} new, -${removedDiff} removed (total: ${this.assets.length})`);
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
      this.priceProducer.publishPriceUpdate(tick).catch((e) => this.logger.warn('publishPriceUpdate failed', e.message));
    }

    // 10틱(10초)마다 DB 저장으로 쓰기 부하 감소 / Persist to DB every 10 ticks (10 seconds) to reduce write pressure
    if (this.tickCount % 10 === 0) {
      await this.persistPrices(ticks);
    }

    // 60틱(1분)마다 1m 캔들스틱 갱신 / Update 1m candlesticks every 60 ticks
    if (this.tickCount % 60 === 0) {
      await this.updateCandlesticks(ticks);
      await this.aggregateHigherIntervals();
    }
  }

  /** 모든 자산의 최신 가격을 Redis 캐시에서 조회합니다
   * Get latest prices for all assets from Redis cache */
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

  /** 특정 심볼의 최신 가격을 조회합니다
   * Get latest price for a specific symbol */
  async getPrice(symbol: string): Promise<PriceTick | null> {
    return this.priceCache.getPrice(symbol);
  }

  /** 활성 자산 목록을 DB에서 조회합니다
   * Get active asset list from database */
  async getAssets() {
    return this.prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' },
    });
  }

  /** 특정 심볼의 가격 히스토리를 DB에서 조회합니다
   * Get price history for a symbol from database */
  async getPriceHistory(symbol: string, limit = 100) {
    return this.prisma.priceHistory.findMany({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * 기간별 등락률을 계산합니다.
   * 암호화폐: Binance klines API로 실제 과거 가격 사용
   * 주식: 시뮬레이션 (tanh 바운딩)
   *
   * Calculates period changes.
   * Crypto: Real historical prices from Binance klines API
   * Stocks: Bounded simulation (tanh)
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

    // 암호화폐: Binance klines API에서 실제 과거 가격 일괄 조회
    // Crypto: Batch fetch real historical prices from Binance klines API
    const cryptoHistoryMap = await this.fetchBinanceHistoricalPrices(days);

    // 주식: 시뮬레이션용 설정 / Stocks: simulation config
    const maxPct: Record<string, number> = {
      '1d': 4, '1w': 8, '1m': 15, '3m': 25, '6m': 35, '1y': 50,
    };
    const periodOffset: Record<string, number> = {
      '1d': 17, '1w': 53, '1m': 97, '3m': 149, '6m': 211, '1y': 277,
    };
    const today = new Date().toISOString().slice(0, 10);

    return currentPrices.map((tick) => {
      const config = assetConfigMap.get(tick.symbol);
      const isCrypto = config?.assetType === 'CRYPTO';

      // 1) 암호화폐: Binance 실제 데이터 / Crypto: real Binance data
      if (isCrypto) {
        const histPrice = cryptoHistoryMap.get(tick.symbol);
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
        // H-06: Binance 과거 데이터가 없는 암호화폐는 시뮬레이션으로 폴백합니다
        // H-06: Crypto with missing Binance historical data falls through to simulation
        this.logger.debug(`No Binance historical data for ${tick.symbol}, using simulation fallback`);
      }

      // 2) 주식 또는 Binance 데이터 없는 경우: 시뮬레이션으로 기간별 등락률 계산
      // Stocks or missing Binance data: calculate period changes via simulation
      const cap = maxPct[period] ?? 30;
      const offset = periodOffset[period] ?? 0;
      const seed = this.hashString(`${tick.symbol}:${period}:${today}`) + offset;
      const random = this.seededGaussian(seed);
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
   * Binance klines API에서 암호화폐 과거 가격을 일괄 조회합니다.
   * 각 심볼별로 해당 기간 시작 시점의 종가(close)를 반환합니다.
   *
   * Fetches historical crypto prices from Binance klines API.
   * Returns the close price at the start of the given period for each symbol.
   */
  private async fetchBinanceHistoricalPrices(days: number): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const startTime = Date.now() - days * 86400000;

    // 병렬 요청 (최대 10개씩 배치) / Parallel requests (batched by 10)
    const cryptoAssets = this.assets.filter((a) => a.assetType === 'CRYPTO');
    const batchSize = 10;

    for (let i = 0; i < cryptoAssets.length; i += batchSize) {
      const batch = cryptoAssets.slice(i, i + batchSize);
      const promises = batch.map(async (asset) => {
        try {
          const binanceSymbol = BINANCE_SYMBOL_MAP.get(asset.symbol);
          if (!binanceSymbol) return;

          const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol.toUpperCase()}&interval=1d&startTime=${startTime}&limit=1`;
          const response = await fetch(url);
          if (!response.ok) return;

          const data = await response.json() as number[][];
          if (data.length > 0) {
            // kline 데이터: [시가시간, 시가, 고가, 저가, 종가, ...] (kline: [openTime, open, high, low, close, ...])
            // H-05: parseFloat은 IEEE-754 배정밀도 부동소수점(~15-17자리)으로 변환됩니다.
            // 대부분의 암호화폐 가격에는 충분하지만, 극단적으로 작은 토큰 가격(소수점 이하 17자리 이상)에서는
            // 정밀도 손실이 발생할 수 있습니다. 현재 지원하는 자산 범위에서는 문제 없음.
            //
            // H-05: parseFloat converts to IEEE-754 double precision (~15-17 significant digits).
            // This is sufficient for most crypto prices but may lose precision for tokens with
            // extreme decimal places (>17 digits). Acceptable for our current supported asset range.
            const openPrice = parseFloat(String(data[0][1]));
            if (openPrice > 0) {
              result.set(asset.symbol, openPrice);
            }
          }
        } catch {
          // 개별 실패 무시 / Ignore individual failures
        }
      });
      await Promise.all(promises);
    }

    return result;
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

  /** 특정 심볼의 캔들스틱 데이터를 조회하고 프론트엔드 호환 타입으로 변환합니다
   * Get candlestick data and convert to frontend-compatible types */
  async getCandlesticks(symbol: string, interval: string, limit = 100) {
    const candles = await this.prisma.candlestick.findMany({
      where: { symbol, interval },
      orderBy: { openTime: 'desc' },
      take: limit,
    });
    // Prisma Decimal/BigInt/Date → 프론트엔드 호환 타입으로 변환
    return candles.map((c) => ({
      id: Number(c.id),
      symbol: c.symbol,
      interval: c.interval,
      openPrice: Number(c.openPrice),
      highPrice: Number(c.highPrice),
      lowPrice: Number(c.lowPrice),
      closePrice: Number(c.closePrice),
      volume: Number(c.volume),
      openTime: c.openTime instanceof Date ? c.openTime.toISOString() : c.openTime,
      closeTime: c.closeTime instanceof Date ? c.closeTime.toISOString() : c.closeTime,
    }));
  }

  /** 가격 틱 데이터를 DB에 영구 저장합니다
   * Persist price tick data to database */
  private async persistPrices(ticks: PriceTick[]) {
    try {
      await this.prisma.priceHistory.createMany({
        data: ticks.map((t) => ({
          symbol: t.symbol,
          price: t.price,
          bid: t.bid,
          ask: t.ask,
          volume: this.clampDecimal(t.volume),
          timestamp: t.timestamp,
        })),
      });
    } catch (error) {
      this.logger.error('Failed to persist prices', error);
    }
  }

  /**
   * Decimal(20,8) 최대값 범위 내로 클램핑 / Clamp to Decimal(20,8) range
   */
  /** Decimal(20,8) column max integer part: 12 digits */
  private static readonly MAX_DECIMAL_20_8 = 999_999_999_999;

  private clampDecimal(value: number): number {
    const clamped = Math.min(Math.max(value, -MarketDataService.MAX_DECIMAL_20_8), MarketDataService.MAX_DECIMAL_20_8);
    // H-07: clampDecimal이 값을 잘라냈을 때 경고 로그 기록
    // H-07: Log warning when clampDecimal truncates values
    if (clamped !== value) {
      this.logger.warn(`clampDecimal truncated value: ${value} → ${clamped}`);
    }
    return clamped;
  }

  /** 1분 캔들스틱을 일괄 upsert하고 고가/저가를 갱신합니다
   * Batch upsert 1-minute candlesticks and update high/low */
  private async updateCandlesticks(ticks: PriceTick[]) {
    const now = new Date();
    const minuteStart = new Date(now);
    minuteStart.setSeconds(0, 0);
    const minuteEnd = new Date(minuteStart.getTime() + 60000);

    // F-H-01: 개별 INSERT 대신 $transaction으로 일괄 처리하여 DB 왕복 횟수를 줄입니다
    // F-H-01: Batch via $transaction instead of individual INSERTs to reduce DB round-trips
    try {
      await this.prisma.$transaction(
        ticks.map((tick) => {
          const vol = this.clampDecimal(tick.volume);
          return this.prisma.$executeRaw`
            INSERT INTO "Candlestick" ("symbol", "interval", "openPrice", "highPrice", "lowPrice", "closePrice", "volume", "openTime", "closeTime")
            VALUES (${tick.symbol}, '1m', ${tick.price}, ${tick.price}, ${tick.price}, ${tick.price}, ${vol}, ${minuteStart}, ${minuteEnd})
            ON CONFLICT ("symbol", "interval", "openTime")
            DO UPDATE SET
              "closePrice" = ${tick.price},
              "volume" = ${vol},
              "highPrice" = GREATEST("Candlestick"."highPrice", ${tick.price}),
              "lowPrice"  = LEAST("Candlestick"."lowPrice", ${tick.price})
          `;
        }),
      );
    } catch (error) {
      this.logger.error('Failed to batch update candlesticks', error);
    }
  }

  /**
   * 1m 캔들스틱을 기반으로 5m/15m/1h/1d 캔들스틱을 집계합니다.
   * Aggregates 1m candles into 5m/15m/1h/1d intervals.
   */
  private async aggregateHigherIntervals() {
    const intervals: { name: string; minutes: number }[] = [
      { name: '5m', minutes: 5 },
      { name: '15m', minutes: 15 },
      { name: '1h', minutes: 60 },
      { name: '1d', minutes: 1440 },
    ];

    const now = new Date();

    for (const { name, minutes } of intervals) {
      try {
        const periodMs = minutes * 60 * 1000;
        const periodStart = new Date(Math.floor(now.getTime() / periodMs) * periodMs);
        const periodEnd = new Date(periodStart.getTime() + periodMs);

        // 해당 기간 내 모든 심볼의 1분 캔들을 일괄 집계 (Aggregate 1m candles within this period for all symbols at once)
        const aggregated = await this.prisma.candlestick.groupBy({
          by: ['symbol'],
          where: {
            interval: '1m',
            openTime: { gte: periodStart, lt: periodEnd },
          },
          _min: { lowPrice: true, openTime: true },
          _max: { highPrice: true },
          _sum: { volume: true },
          _count: true,
        });

        const symbols = aggregated.filter((a) => a._count > 0).map((a) => a.symbol);
        if (symbols.length === 0) continue;

        // 단일 윈도우 함수 쿼리로 첫/마지막 캔들의 open/close 가격을 조회 (2개 쿼리 → 1개)
        // Single window function query to fetch first/last candle open/close prices (2 queries → 1)
        const openCloseRows = await this.prisma.$queryRaw<{ symbol: string; open_price: any; close_price: any }[]>`
          SELECT DISTINCT ON (symbol) symbol,
            FIRST_VALUE("open_price") OVER (PARTITION BY symbol ORDER BY "open_time" ASC) AS open_price,
            FIRST_VALUE("close_price") OVER (PARTITION BY symbol ORDER BY "open_time" DESC) AS close_price
          FROM candlesticks
          WHERE symbol = ANY(${symbols}::text[])
            AND interval = '1m'
            AND "open_time" >= ${periodStart}
            AND "open_time" < ${periodEnd}
        `;

        const firstMap = new Map(openCloseRows.map((r) => [r.symbol, r.open_price]));
        const lastMap = new Map(openCloseRows.map((r) => [r.symbol, r.close_price]));

        // F-H-02: 심볼별 개별 upsert 대신 $transaction으로 일괄 처리하여 DB 왕복 감소
        // F-H-02: Batch upserts via $transaction instead of per-symbol to reduce DB round-trips
        const upsertOps = aggregated
          .filter((agg) => agg._count > 0)
          .map((agg) => {
            const firstOpenPrice = firstMap.get(agg.symbol);
            const lastClosePrice = lastMap.get(agg.symbol);
            if (!firstOpenPrice || !lastClosePrice) return null;

            return this.prisma.candlestick.upsert({
              where: {
                symbol_interval_openTime: {
                  symbol: agg.symbol,
                  interval: name,
                  openTime: periodStart,
                },
              },
              create: {
                symbol: agg.symbol,
                interval: name,
                openPrice: firstOpenPrice,
                highPrice: agg._max.highPrice!,
                lowPrice: agg._min.lowPrice!,
                closePrice: lastClosePrice,
                volume: agg._sum.volume ?? 0,
                openTime: periodStart,
                closeTime: periodEnd,
              },
              update: {
                highPrice: agg._max.highPrice!,
                lowPrice: agg._min.lowPrice!,
                closePrice: lastClosePrice,
                volume: agg._sum.volume ?? 0,
              },
            });
          })
          .filter((op): op is NonNullable<typeof op> => op !== null);

        if (upsertOps.length > 0) {
          await this.prisma.$transaction(upsertOps);
        }
      } catch (error) {
        this.logger.error(`Failed to aggregate ${name} candlesticks`, error);
      }
    }
  }
}
