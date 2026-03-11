import { ConfigService } from '@nestjs/config';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(() => {
    // ConfigService 모킹 — Gemini 키 없이 규칙 기반 폴백 테스트
    // Mock ConfigService — test rule-based fallback without Gemini key
    const mockConfig = { get: (_key: string) => undefined } as unknown as ConfigService;
    service = new AnalysisService(mockConfig);
  });

  describe('getMarketSignals', () => {
    it('should return signals for all demo assets', async () => {
      const signals = await service.getMarketSignals();
      expect(signals.length).toBe(6);
      expect(signals.map((s) => s.symbol)).toEqual(
        expect.arrayContaining([
          'BTCUSDT',
          'ETHUSDT',
          'SOLUSDT',
          'AAPL',
          'TSLA',
          'NVDA',
        ]),
      );
    });

    it('should return valid signal types', async () => {
      const signals = await service.getMarketSignals();
      const validSignals = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
      signals.forEach((s) => {
        expect(validSignals).toContain(s.signal);
      });
    });

    it('should return confidence between 55 and 94', async () => {
      const signals = await service.getMarketSignals();
      signals.forEach((s) => {
        expect(s.confidence).toBeGreaterThanOrEqual(55);
        expect(s.confidence).toBeLessThanOrEqual(94);
      });
    });

    it('should return valid risk levels', async () => {
      const signals = await service.getMarketSignals();
      signals.forEach((s) => {
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(s.riskLevel);
      });
    });

    it('should return non-empty reasons', async () => {
      const signals = await service.getMarketSignals();
      signals.forEach((s) => {
        expect(s.reason.length).toBeGreaterThan(0);
      });
    });

    it('should have target price >= stop loss for each signal', async () => {
      const signals = await service.getMarketSignals();
      signals.forEach((s) => {
        expect(s.targetPrice).toBeGreaterThanOrEqual(s.stopLoss);
      });
    });

    it('should assign risk based on asset volatility', async () => {
      const signals = await service.getMarketSignals();
      const sol = signals.find((s) => s.symbol === 'SOLUSDT');
      const tsla = signals.find((s) => s.symbol === 'TSLA');
      expect(sol!.riskLevel).toBe('HIGH');
      expect(tsla!.riskLevel).toBe('HIGH');

      const aapl = signals.find((s) => s.symbol === 'AAPL');
      expect(aapl!.riskLevel).toBe('LOW');

      const btc = signals.find((s) => s.symbol === 'BTCUSDT');
      const eth = signals.find((s) => s.symbol === 'ETHUSDT');
      const nvda = signals.find((s) => s.symbol === 'NVDA');
      expect(btc!.riskLevel).toBe('MEDIUM');
      expect(eth!.riskLevel).toBe('MEDIUM');
      expect(nvda!.riskLevel).toBe('MEDIUM');
    });

    it('should return deterministic results within the same day', async () => {
      const signals1 = await service.getMarketSignals();
      const signals2 = await service.getMarketSignals();
      expect(signals1).toEqual(signals2);
    });

    it('should return positive target price and stop loss', async () => {
      const signals = await service.getMarketSignals();
      signals.forEach((s) => {
        expect(s.targetPrice).toBeGreaterThan(0);
        expect(s.stopLoss).toBeGreaterThan(0);
      });
    });
  });

  describe('analyzePortfolio', () => {
    it('should return zero scores for empty portfolio', async () => {
      const result = await service.analyzePortfolio([]);
      expect(result.diversificationScore).toBe(0);
      expect(result.riskScore).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should return default suggestion for empty portfolio', async () => {
      const result = await service.analyzePortfolio([]);
      expect(result.suggestions).toContain(
        'Start building your portfolio by purchasing assets.',
      );
    });

    it('should return low diversification for single asset', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 10000 },
      ]);
      expect(result.diversificationScore).toBe(0);
    });

    it('should return higher diversification for multiple assets', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 5000 },
        { symbol: 'ETHUSDT', value: 3000 },
        { symbol: 'AAPL', value: 2000 },
      ]);
      expect(result.diversificationScore).toBeGreaterThan(0);
    });

    it('should return equal diversification for equally weighted assets', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 1000 },
        { symbol: 'ETHUSDT', value: 1000 },
        { symbol: 'AAPL', value: 1000 },
        { symbol: 'TSLA', value: 1000 },
      ]);
      expect(result.diversificationScore).toBe(75);
    });

    it('should return higher risk for crypto-heavy portfolio', async () => {
      const cryptoHeavy = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 8000 },
        { symbol: 'ETHUSDT', value: 2000 },
      ]);
      const balanced = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 3000 },
        { symbol: 'AAPL', value: 3000 },
        { symbol: 'TSLA', value: 4000 },
      ]);
      expect(cryptoHeavy.riskScore).toBeGreaterThan(balanced.riskScore);
    });

    it('should suggest diversification for few assets', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 5000 },
        { symbol: 'ETHUSDT', value: 5000 },
      ]);
      expect(
        result.suggestions.some((s) => s.toLowerCase().includes('diversif')),
      ).toBe(true);
    });

    it('should suggest reducing crypto for crypto-heavy portfolio', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 8000 },
        { symbol: 'ETHUSDT', value: 2000 },
      ]);
      expect(
        result.suggestions.some((s) => s.toLowerCase().includes('crypto')),
      ).toBe(true);
    });

    it('should cap risk score at 100', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 10000 },
      ]);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should suggest rebalancing when single asset exceeds 50%', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 8000 },
        { symbol: 'AAPL', value: 2000 },
      ]);
      expect(
        result.suggestions.some((s) => s.includes('rebalancing')),
      ).toBe(true);
      expect(
        result.suggestions.some((s) => s.includes('BTCUSDT')),
      ).toBe(true);
    });

    it('should show well-diversified message when portfolio is healthy', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'AAPL', value: 2500 },
        { symbol: 'TSLA', value: 2500 },
        { symbol: 'NVDA', value: 2500 },
        { symbol: 'GOOG', value: 2500 },
      ]);
      expect(
        result.suggestions.some((s) => s.includes('well-diversified')),
      ).toBe(true);
    });

    it('should compute correct diversification for two equal assets', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'AAPL', value: 5000 },
        { symbol: 'TSLA', value: 5000 },
      ]);
      expect(result.diversificationScore).toBe(50);
    });

    it('should count stock-only portfolio with lower risk than crypto', async () => {
      const stockOnly = await service.analyzePortfolio([
        { symbol: 'AAPL', value: 5000 },
        { symbol: 'TSLA', value: 5000 },
      ]);
      expect(stockOnly.riskScore).toBe(35);
    });

    it('should identify crypto symbols that contain known crypto tickers', async () => {
      const result = await service.analyzePortfolio([
        { symbol: 'BTC-PERP', value: 10000 },
      ]);
      expect(result.riskScore).toBe(100);
    });
  });
});
