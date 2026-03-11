/**
 * @file 가격 시뮬레이션 엔진
 * @description 기하 브라운 운동(GBM) 기반으로 자산 가격을 시뮬레이션합니다
 *
 * @file Price Simulation Engine
 * @description Simulates asset prices using Geometric Brownian Motion (GBM)
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetConfig, PriceTick } from '../entities/asset.entity';

/**
 * 기하 브라운 운동(GBM)을 사용한 모의 가격 엔진.
 *
 * Simulated price engine using Geometric Brownian Motion (GBM).
 *
 * dS = μ*S*dt + σ*S*dW
 *
 * 여기서 / Where:
 * - S = 현재 가격 / current price
 * - μ = 드리프트 (연간 수익률, 모의 거래에서는 0에 가깝게 설정) / drift (annualized return, set near 0 for mock)
 * - σ = 변동성 (연간) / volatility (annualized)
 * - dt = 시간 단위 / time step
 * - dW = 위너 과정 증분 ~ N(0, sqrt(dt)) / Wiener process increment ~ N(0, sqrt(dt))
 */
@Injectable()
export class PriceEngineService {
  private readonly logger = new Logger(PriceEngineService.name);

  private prices: Map<string, number> = new Map();
  private openPrices24h: Map<string, number> = new Map();
  private high24h: Map<string, number> = new Map();
  private low24h: Map<string, number> = new Map();
  private volumes: Map<string, number> = new Map();

  // 변동성 이벤트: 극적인 가격 움직임을 위해 일시적으로 변동성 급등 / Volatility events: temporarily spike volatility for dramatic price action
  private volatilityMultipliers: Map<string, { multiplier: number; expiresAt: number }> = new Map();

  // 환경 변수로 설정 가능한 엔진 파라미터 / Engine parameters configurable via environment variables
  private readonly TICK_INTERVAL_MS: number;
  private readonly SECONDS_PER_YEAR = 365.25 * 24 * 3600;
  private readonly DRIFT: number;
  private readonly VOLATILITY_EVENT_PROBABILITY: number;
  private readonly VOLATILITY_EVENT_DURATION_MS: number;
  private readonly VOLATILITY_MULTIPLIER_MIN: number;
  private readonly VOLATILITY_MULTIPLIER_MAX: number;
  private readonly MIN_PRICE: number;

  constructor(private readonly config: ConfigService) {
    this.TICK_INTERVAL_MS = this.config.get<number>('PRICE_ENGINE_TICK_INTERVAL_MS', 1000);
    // M-03: 드리프트 기본값 0.0은 의도적인 설계입니다.
    // 모의 거래 플랫폼에서는 가격이 장기적으로 상승/하락 추세를 갖지 않도록
    // 중립적인 랜덤 워크를 사용합니다. 실제 시장의 장기 상승 편향(equity risk premium)을
    // 모사하려면 양수 값(예: 0.07 = 연 7%)으로 설정할 수 있습니다.
    //
    // M-03: Drift default of 0.0 is an intentional design choice.
    // For a mock trading platform, prices should follow a neutral random walk without
    // long-term upward/downward bias. To simulate real-market long-term appreciation
    // (equity risk premium), set to a positive value (e.g., 0.07 = 7% annual return).
    this.DRIFT = this.config.get<number>('PRICE_ENGINE_DRIFT', 0.0);
    this.VOLATILITY_EVENT_PROBABILITY = this.config.get<number>('PRICE_ENGINE_VOLATILITY_EVENT_PROBABILITY', 0.002);
    this.VOLATILITY_EVENT_DURATION_MS = this.config.get<number>('PRICE_ENGINE_VOLATILITY_EVENT_DURATION_MS', 30000);
    this.VOLATILITY_MULTIPLIER_MIN = this.config.get<number>('PRICE_ENGINE_VOLATILITY_MULTIPLIER_MIN', 2);
    this.VOLATILITY_MULTIPLIER_MAX = this.config.get<number>('PRICE_ENGINE_VOLATILITY_MULTIPLIER_MAX', 4);
    this.MIN_PRICE = this.config.get<number>('PRICE_ENGINE_MIN_PRICE', 0.0001);
  }

  /** 자산의 초기 가격 및 추적 상태를 설정합니다
   * Initialize asset price and tracking state */
  initializeAsset(config: AssetConfig): void {
    this.prices.set(config.symbol, config.basePrice);
    this.openPrices24h.set(config.symbol, config.basePrice);
    this.high24h.set(config.symbol, config.basePrice);
    this.low24h.set(config.symbol, config.basePrice);
    this.volumes.set(config.symbol, 0);
    this.logger.log(`Initialized ${config.symbol} at $${config.basePrice}`);
  }

  /**
   * 특정 종목에 변동성 이벤트를 발생시킵니다 (30초간 정상 변동성의 2-4배).
   *
   * Trigger a volatility event for a symbol (2-4x normal volatility for 30s).
   */
  triggerVolatilityEvent(symbol: string): void {
    const multiplier = this.VOLATILITY_MULTIPLIER_MIN + Math.random() * (this.VOLATILITY_MULTIPLIER_MAX - this.VOLATILITY_MULTIPLIER_MIN);
    this.volatilityMultipliers.set(symbol, {
      multiplier,
      expiresAt: Date.now() + this.VOLATILITY_EVENT_DURATION_MS,
    });
    this.logger.warn(`Volatility event triggered for ${symbol}: ${multiplier.toFixed(1)}x for ${this.VOLATILITY_EVENT_DURATION_MS / 1000}s`);
  }

  /** 변동성 이벤트를 반영한 유효 변동성을 계산합니다
   * Calculate effective volatility considering volatility events */
  private getEffectiveVolatility(config: AssetConfig): number {
    const event = this.volatilityMultipliers.get(config.symbol);
    if (event && Date.now() < event.expiresAt) {
      return config.volatility * event.multiplier;
    }
    if (event) {
      this.volatilityMultipliers.delete(config.symbol);
    }
    return config.volatility;
  }

  /**
   * GBM 모델을 사용하여 다음 가격 틱을 생성합니다.
   *
   * Generate next price tick using GBM model.
   */
  generateTick(config: AssetConfig): PriceTick {
    const currentPrice = this.prices.get(config.symbol) || config.basePrice;

    // 랜덤 변동성 이벤트 / Random volatility events
    if (Math.random() < this.VOLATILITY_EVENT_PROBABILITY && !this.volatilityMultipliers.has(config.symbol)) {
      this.triggerVolatilityEvent(config.symbol);
    }

    const effectiveVolatility = this.getEffectiveVolatility(config);

    // 연 단위 시간 단계 / Time step in years
    const dt = this.TICK_INTERVAL_MS / 1000 / this.SECONDS_PER_YEAR;

    // 위너 과정 증분: dW ~ N(0, sqrt(dt)) / Wiener process increment: dW ~ N(0, sqrt(dt))
    const dW = this.gaussianRandom() * Math.sqrt(dt);

    // GBM 공식: dS = μ*S*dt + σ*S*dW
    const dS = this.DRIFT * currentPrice * dt + effectiveVolatility * currentPrice * dW;

    // 새 가격 (최소값 적용) / New price (enforce minimum)
    let newPrice = Math.max(currentPrice + dS, this.MIN_PRICE);

    // 가격 크기에 따른 반올림 / Round based on price magnitude
    newPrice = this.roundPrice(newPrice);

    // 매수-매도 스프레드 / Bid-ask spread
    const halfSpread = (newPrice * config.spreadBps) / 10000 / 2;
    const bid = this.roundPrice(newPrice - halfSpread);
    const ask = this.roundPrice(newPrice + halfSpread);

    // 거래량 시뮬레이션: 기본 거래량 + 변동성 기반 급등 + 랜덤 노이즈 / Simulate volume: base volume + volatility-driven spikes + random noise
    const baseVolume = config.basePrice > 100 ? 500 : 10000; // 고가 자산은 적은 수량 거래 / higher-priced assets trade fewer units
    const volatilityFactor = effectiveVolatility / config.volatility; // 변동성 이벤트 시 급등 / spikes during volatility events
    // M-04: 거래량 이동 팩터를 5x로 상한 제한하여 극단적인 가격 변동 시
    // 비현실적인 거래량 급등을 방지합니다.
    // M-04: Cap volume movement factor at 5x to prevent unrealistic volume spikes
    // during extreme price movements.
    const movementFactor = Math.min(Math.abs(dS / currentPrice) * 50, 5);
    const randomNoise = 0.5 + Math.random();
    const volumeDelta = (baseVolume * movementFactor + baseVolume * 0.1 * randomNoise) * volatilityFactor;
    const currentVolume = (this.volumes.get(config.symbol) || 0) + volumeDelta;
    this.volumes.set(config.symbol, currentVolume);

    // 가격 갱신 / Update price
    this.prices.set(config.symbol, newPrice);

    // 24시간 고가/저가 추적 / Track 24h high/low
    const currentHigh = this.high24h.get(config.symbol) || newPrice;
    const currentLow = this.low24h.get(config.symbol) || newPrice;
    if (newPrice > currentHigh) this.high24h.set(config.symbol, newPrice);
    if (newPrice < currentLow) this.low24h.set(config.symbol, newPrice);

    // 24시간 변동 / 24h change
    const openPrice = this.openPrices24h.get(config.symbol) || config.basePrice;
    const change24h = newPrice - openPrice;
    const changePercent24h = (change24h / openPrice) * 100;

    return {
      symbol: config.symbol,
      price: newPrice,
      bid,
      ask,
      volume: this.roundPrice(currentVolume),
      change24h: this.roundPrice(change24h),
      changePercent24h: Math.round(changePercent24h * 100) / 100,
      high24h: this.high24h.get(config.symbol) || newPrice,
      low24h: this.low24h.get(config.symbol) || newPrice,
      timestamp: new Date(),
    };
  }

  /**
   * 외부 데이터(Binance)로 엔진 내부 상태를 동기화합니다.
   * Binance 연결 끊김 시 마지막 가격부터 GBM이 이어가므로 부드러운 전환.
   *
   * Sync engine internal state from external data (Binance).
   * On disconnect, GBM continues from last price for smooth transition.
   */
  updateFromExternal(symbol: string, tick: PriceTick): void {
    this.prices.set(symbol, tick.price);
    this.high24h.set(symbol, tick.high24h);
    this.low24h.set(symbol, tick.low24h);
    this.volumes.set(symbol, tick.volume);
  }

  /** 특정 심볼의 현재 가격을 반환합니다
   * Get current price for a symbol */
  getCurrentPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }

  /**
   * 24시간 추적 통계 초기화 (주기적으로 호출).
   *
   * Reset 24h tracking (called periodically).
   */
  reset24hStats(symbol: string): void {
    const current = this.prices.get(symbol);
    if (current) {
      this.openPrices24h.set(symbol, current);
      this.high24h.set(symbol, current);
      this.low24h.set(symbol, current);
      this.volumes.set(symbol, 0);
    }
  }

  /**
   * 가우시안 난수 생성을 위한 Box-Muller 변환.
   *
   * Box-Muller transform for Gaussian random numbers.
   */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /** 가격 크기에 따라 적절한 소수점으로 반올림합니다
   * Round price to appropriate decimal places based on magnitude */
  private roundPrice(price: number): number {
    if (price >= 1000) return Math.round(price * 100) / 100;
    if (price >= 1) return Math.round(price * 10000) / 10000;
    return Math.round(price * 100000000) / 100000000;
  }
}
