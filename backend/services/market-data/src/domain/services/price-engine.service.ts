/**
 * @file 가격 시뮬레이션 엔진
 * @description 기하 브라운 운동(GBM) 기반으로 자산 가격을 시뮬레이션합니다
 *
 * @file Price Simulation Engine
 * @description Simulates asset prices using Geometric Brownian Motion (GBM)
 */
import { Injectable, Logger } from '@nestjs/common';
import { AssetConfig, PriceTick } from '../entities/asset.entity';

/**
 * Simulated price engine using Geometric Brownian Motion (GBM).
 *
 * dS = μ*S*dt + σ*S*dW
 *
 * Where:
 * - S = current price
 * - μ = drift (annualized return, set near 0 for mock)
 * - σ = volatility (annualized)
 * - dt = time step
 * - dW = Wiener process increment ~ N(0, sqrt(dt))
 */
@Injectable()
export class PriceEngineService {
  private readonly logger = new Logger(PriceEngineService.name);

  private prices: Map<string, number> = new Map();
  private openPrices24h: Map<string, number> = new Map();
  private high24h: Map<string, number> = new Map();
  private low24h: Map<string, number> = new Map();
  private volumes: Map<string, number> = new Map();

  // Volatility events: temporarily spike volatility for dramatic price action
  private volatilityMultipliers: Map<string, { multiplier: number; expiresAt: number }> = new Map();

  private readonly TICK_INTERVAL_MS = 1000; // 1 second ticks
  private readonly SECONDS_PER_YEAR = 365.25 * 24 * 3600;
  private readonly DRIFT = 0.0; // neutral drift for mock trading
  private readonly VOLATILITY_EVENT_PROBABILITY = 0.002; // ~0.2% chance per tick per asset
  private readonly VOLATILITY_EVENT_DURATION_MS = 30000; // 30 seconds

  initializeAsset(config: AssetConfig): void {
    this.prices.set(config.symbol, config.basePrice);
    this.openPrices24h.set(config.symbol, config.basePrice);
    this.high24h.set(config.symbol, config.basePrice);
    this.low24h.set(config.symbol, config.basePrice);
    this.volumes.set(config.symbol, 0);
    this.logger.log(`Initialized ${config.symbol} at $${config.basePrice}`);
  }

  /**
   * Trigger a volatility event for a symbol (2-4x normal volatility for 30s).
   */
  triggerVolatilityEvent(symbol: string): void {
    const multiplier = 2 + Math.random() * 2; // 2x-4x
    this.volatilityMultipliers.set(symbol, {
      multiplier,
      expiresAt: Date.now() + this.VOLATILITY_EVENT_DURATION_MS,
    });
    this.logger.warn(`Volatility event triggered for ${symbol}: ${multiplier.toFixed(1)}x for ${this.VOLATILITY_EVENT_DURATION_MS / 1000}s`);
  }

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
   * Generate next price tick using GBM model.
   */
  generateTick(config: AssetConfig): PriceTick {
    const currentPrice = this.prices.get(config.symbol) || config.basePrice;

    // Random volatility events
    if (Math.random() < this.VOLATILITY_EVENT_PROBABILITY && !this.volatilityMultipliers.has(config.symbol)) {
      this.triggerVolatilityEvent(config.symbol);
    }

    const effectiveVolatility = this.getEffectiveVolatility(config);

    // Time step in years
    const dt = this.TICK_INTERVAL_MS / 1000 / this.SECONDS_PER_YEAR;

    // Wiener process increment: dW ~ N(0, sqrt(dt))
    const dW = this.gaussianRandom() * Math.sqrt(dt);

    // GBM: dS = μ*S*dt + σ*S*dW
    const dS = this.DRIFT * currentPrice * dt + effectiveVolatility * currentPrice * dW;

    // New price (enforce minimum of 0.0001)
    let newPrice = Math.max(currentPrice + dS, 0.0001);

    // Round based on price magnitude
    newPrice = this.roundPrice(newPrice);

    // Bid-ask spread
    const halfSpread = (newPrice * config.spreadBps) / 10000 / 2;
    const bid = this.roundPrice(newPrice - halfSpread);
    const ask = this.roundPrice(newPrice + halfSpread);

    // Simulate volume: base volume + volatility-driven spikes + random noise
    const baseVolume = config.basePrice > 100 ? 500 : 10000; // higher-priced assets trade fewer units
    const volatilityFactor = effectiveVolatility / config.volatility; // spikes during volatility events
    const movementFactor = Math.abs(dS / currentPrice) * 50;
    const randomNoise = 0.5 + Math.random();
    const volumeDelta = (baseVolume * movementFactor + baseVolume * 0.1 * randomNoise) * volatilityFactor;
    const currentVolume = (this.volumes.get(config.symbol) || 0) + volumeDelta;
    this.volumes.set(config.symbol, currentVolume);

    // Update price
    this.prices.set(config.symbol, newPrice);

    // Track 24h high/low
    const currentHigh = this.high24h.get(config.symbol) || newPrice;
    const currentLow = this.low24h.get(config.symbol) || newPrice;
    if (newPrice > currentHigh) this.high24h.set(config.symbol, newPrice);
    if (newPrice < currentLow) this.low24h.set(config.symbol, newPrice);

    // 24h change
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

  getCurrentPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }

  /**
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
   * Box-Muller transform for Gaussian random numbers.
   */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private roundPrice(price: number): number {
    if (price >= 1000) return Math.round(price * 100) / 100;
    if (price >= 1) return Math.round(price * 10000) / 10000;
    return Math.round(price * 100000000) / 100000000;
  }
}
