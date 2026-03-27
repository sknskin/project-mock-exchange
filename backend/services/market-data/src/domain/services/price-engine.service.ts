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
 * H-H-01: 심볼별 가격 추적 상태를 하나의 구조체로 통합합니다.
 * 기존 6개 Map(prices, openPrices24h, high24h, low24h, volumes, volatilityMultipliers)을
 * 단일 Map<string, SymbolState>으로 통합하여 캐시 지역성과 메모리 효율을 개선합니다.
 *
 * H-H-01: Consolidates per-symbol tracking state into a single struct.
 * Merges 6 separate Maps into one Map<string, SymbolState> for better cache locality
 * and memory efficiency.
 */
interface SymbolState {
  /** 현재 가격 / Current price */
  price: number;
  /** 24시간 시작 가격 / 24h opening price */
  openPrice24h: number;
  /** 24시간 고가 / 24h high price */
  high24h: number;
  /** 24시간 저가 / 24h low price */
  low24h: number;
  /** 누적 거래량 / Accumulated volume */
  volume: number;
  /** 변동성 이벤트 (활성 시) / Volatility event (when active) */
  volatilityEvent: { multiplier: number; expiresAt: number } | null;
}

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

  /** H-H-01: 심볼별 모든 추적 상태를 단일 Map으로 통합
   * H-H-01: All per-symbol tracking state consolidated into a single Map */
  private symbols: Map<string, SymbolState> = new Map();

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
    // 초기 거래량 — 한국 주식은 높은 시작값으로 거래대금 정렬에서 코인과 섞이도록
    // Initial volume — Korean stocks start high so they mix with crypto in turnover sort
    const isKR = config.symbol.endsWith('.KS');
    const initialVolume = isKR
      ? (config.basePrice > 200000 ? 2_000_000 : config.basePrice > 50000 ? 5_000_000 : 10_000_000)
      : 0;

    this.symbols.set(config.symbol, {
      price: config.basePrice,
      openPrice24h: config.basePrice,
      high24h: config.basePrice,
      low24h: config.basePrice,
      volume: initialVolume,
      volatilityEvent: null,
    });
    this.logger.log(`Initialized ${config.symbol} at $${config.basePrice}`);
  }

  /**
   * 특정 종목에 변동성 이벤트를 발생시킵니다 (30초간 정상 변동성의 2-4배).
   *
   * Trigger a volatility event for a symbol (2-4x normal volatility for 30s).
   */
  triggerVolatilityEvent(symbol: string): void {
    const state = this.symbols.get(symbol);
    if (!state) return;
    const multiplier = this.VOLATILITY_MULTIPLIER_MIN + Math.random() * (this.VOLATILITY_MULTIPLIER_MAX - this.VOLATILITY_MULTIPLIER_MIN);
    state.volatilityEvent = {
      multiplier,
      expiresAt: Date.now() + this.VOLATILITY_EVENT_DURATION_MS,
    };
    this.logger.warn(`Volatility event triggered for ${symbol}: ${multiplier.toFixed(1)}x for ${this.VOLATILITY_EVENT_DURATION_MS / 1000}s`);
  }

  /** 변동성 이벤트를 반영한 유효 변동성을 계산합니다
   * Calculate effective volatility considering volatility events */
  private getEffectiveVolatility(config: AssetConfig): number {
    const state = this.symbols.get(config.symbol);
    if (!state || !state.volatilityEvent) return config.volatility;
    if (Date.now() < state.volatilityEvent.expiresAt) {
      return config.volatility * state.volatilityEvent.multiplier;
    }
    // 만료된 변동성 이벤트 제거 / Clear expired volatility event
    state.volatilityEvent = null;
    return config.volatility;
  }

  /**
   * GBM 모델을 사용하여 다음 가격 틱을 생성합니다.
   *
   * Generate next price tick using GBM model.
   */
  generateTick(config: AssetConfig): PriceTick {
    const state = this.symbols.get(config.symbol);
    const currentPrice = state?.price || config.basePrice;

    // 랜덤 변동성 이벤트 / Random volatility events
    if (Math.random() < this.VOLATILITY_EVENT_PROBABILITY && (!state || !state.volatilityEvent)) {
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

    // 거래량 시뮬레이션: 통화/자산 유형별 현실적 기본 거래량
    // Volume simulation: realistic base volume per currency/asset type
    const isKR = config.symbol.endsWith('.KS');
    const isCrypto = config.symbol.includes('-');
    let baseVolume: number;
    if (isKR) {
      // 한국 주식 — 원화 고가 종목도 충분한 USD 환산 거래대금 생성
      // Korean stocks — generate sufficient USD-equivalent turnover
      // 삼성전자 72,000원 × 50,000주 = ₩3.6B ÷ 1400 = $2.6M/tick
      baseVolume = config.basePrice > 200000 ? 15000 : config.basePrice > 50000 ? 50000 : 100000;
    } else if (isCrypto) {
      // 암호화폐 — 기존 유지
      // Crypto — keep existing
      baseVolume = config.basePrice > 100 ? 500 : 10000;
    } else {
      // 미국 주식 — 기존 유지
      // US stocks — keep existing
      baseVolume = config.basePrice > 100 ? 500 : 10000;
    }
    const volatilityFactor = effectiveVolatility / config.volatility; // 변동성 이벤트 시 급등 / spikes during volatility events
    // M-04: 거래량 이동 팩터를 5x로 상한 제한하여 극단적인 가격 변동 시
    // 비현실적인 거래량 급등을 방지합니다.
    // M-04: Cap volume movement factor at 5x to prevent unrealistic volume spikes
    // during extreme price movements.
    const movementFactor = Math.min(Math.abs(dS / currentPrice) * 50, 5);
    const randomNoise = 0.5 + Math.random();
    const volumeDelta = (baseVolume * movementFactor + baseVolume * 0.1 * randomNoise) * volatilityFactor;
    const currentVolume = (state?.volume || 0) + volumeDelta;

    // 상태 일괄 갱신 / Batch update state
    if (state) {
      state.price = newPrice;
      state.volume = currentVolume;
      if (newPrice > state.high24h) state.high24h = newPrice;
      if (newPrice < state.low24h) state.low24h = newPrice;
    }

    // 24시간 변동 / 24h change
    const openPrice = state?.openPrice24h || config.basePrice;
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
      high24h: state?.high24h || newPrice,
      low24h: state?.low24h || newPrice,
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
    const state = this.symbols.get(symbol);
    if (state) {
      state.price = tick.price;
      state.high24h = tick.high24h;
      state.low24h = tick.low24h;
      state.volume = tick.volume;
    }
  }

  /** 특정 심볼의 현재 가격을 반환합니다
   * Get current price for a symbol */
  getCurrentPrice(symbol: string): number | undefined {
    return this.symbols.get(symbol)?.price;
  }

  /**
   * 24시간 추적 통계 초기화 (주기적으로 호출).
   *
   * Reset 24h tracking (called periodically).
   */
  reset24hStats(symbol: string): void {
    const state = this.symbols.get(symbol);
    if (state) {
      state.openPrice24h = state.price;
      state.high24h = state.price;
      state.low24h = state.price;
      state.volume = 0;
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
