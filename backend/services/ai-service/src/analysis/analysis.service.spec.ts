import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(() => {
    service = new AnalysisService();
  });

  describe('getMarketSignals', () => {
    it('should return signals for all demo assets', () => {
      const signals = service.getMarketSignals();
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

    it('should return valid signal types', () => {
      const signals = service.getMarketSignals();
      const validSignals = [
        'STRONG_BUY',
        'BUY',
        'HOLD',
        'SELL',
        'STRONG_SELL',
      ];
      signals.forEach((s) => {
        expect(validSignals).toContain(s.signal);
      });
    });

    it('should return confidence between 55 and 94', () => {
      // confidence = 55 + (hash % 40), hash max=99 so hash%40 max=39 => max confidence=94
      const signals = service.getMarketSignals();
      signals.forEach((s) => {
        expect(s.confidence).toBeGreaterThanOrEqual(55);
        expect(s.confidence).toBeLessThanOrEqual(94);
      });
    });

    it('should return valid risk levels', () => {
      const signals = service.getMarketSignals();
      signals.forEach((s) => {
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(s.riskLevel);
      });
    });

    it('should return non-empty reasons', () => {
      const signals = service.getMarketSignals();
      signals.forEach((s) => {
        expect(s.reason.length).toBeGreaterThan(0);
      });
    });

    it('should have target price >= stop loss for each signal', () => {
      // When priceDelta is 0, targetPrice === stopLoss === basePrice
      const signals = service.getMarketSignals();
      signals.forEach((s) => {
        expect(s.targetPrice).toBeGreaterThanOrEqual(s.stopLoss);
      });
    });

    it('should assign risk based on asset volatility', () => {
      const signals = service.getMarketSignals();
      // SOLUSDT (0.08) and TSLA (0.07) have volatility > 0.06 => HIGH
      const sol = signals.find((s) => s.symbol === 'SOLUSDT');
      const tsla = signals.find((s) => s.symbol === 'TSLA');
      expect(sol!.riskLevel).toBe('HIGH');
      expect(tsla!.riskLevel).toBe('HIGH');

      // AAPL (0.03) has volatility <= 0.04 => LOW
      const aapl = signals.find((s) => s.symbol === 'AAPL');
      expect(aapl!.riskLevel).toBe('LOW');

      // BTCUSDT (0.05), ETHUSDT (0.06), NVDA (0.06) have volatility > 0.04 and <= 0.06 => MEDIUM
      const btc = signals.find((s) => s.symbol === 'BTCUSDT');
      const eth = signals.find((s) => s.symbol === 'ETHUSDT');
      const nvda = signals.find((s) => s.symbol === 'NVDA');
      expect(btc!.riskLevel).toBe('MEDIUM');
      expect(eth!.riskLevel).toBe('MEDIUM');
      expect(nvda!.riskLevel).toBe('MEDIUM');
    });

    it('should return deterministic results within the same day', () => {
      const signals1 = service.getMarketSignals();
      const signals2 = service.getMarketSignals();
      expect(signals1).toEqual(signals2);
    });

    it('should return positive target price and stop loss', () => {
      const signals = service.getMarketSignals();
      signals.forEach((s) => {
        expect(s.targetPrice).toBeGreaterThan(0);
        expect(s.stopLoss).toBeGreaterThan(0);
      });
    });
  });

  describe('analyzePortfolio', () => {
    it('should return zero scores for empty portfolio', () => {
      const result = service.analyzePortfolio([]);
      expect(result.diversificationScore).toBe(0);
      expect(result.riskScore).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should return default suggestion for empty portfolio', () => {
      const result = service.analyzePortfolio([]);
      expect(result.suggestions).toContain(
        'Start building your portfolio by purchasing assets.',
      );
    });

    it('should return low diversification for single asset', () => {
      const result = service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 10000 },
      ]);
      // HHI = 1^2 = 1, diversificationScore = (1-1)*100 = 0
      expect(result.diversificationScore).toBe(0);
    });

    it('should return higher diversification for multiple assets', () => {
      const result = service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 5000 },
        { symbol: 'ETHUSDT', value: 3000 },
        { symbol: 'AAPL', value: 2000 },
      ]);
      expect(result.diversificationScore).toBeGreaterThan(0);
    });

    it('should return equal diversification for equally weighted assets', () => {
      const result = service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 1000 },
        { symbol: 'ETHUSDT', value: 1000 },
        { symbol: 'AAPL', value: 1000 },
        { symbol: 'TSLA', value: 1000 },
      ]);
      // HHI = 4 * (0.25)^2 = 0.25, diversificationScore = (1-0.25)*100 = 75
      expect(result.diversificationScore).toBe(75);
    });

    it('should return higher risk for crypto-heavy portfolio', () => {
      const cryptoHeavy = service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 8000 },
        { symbol: 'ETHUSDT', value: 2000 },
      ]);
      const balanced = service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 3000 },
        { symbol: 'AAPL', value: 3000 },
        { symbol: 'TSLA', value: 4000 },
      ]);
      expect(cryptoHeavy.riskScore).toBeGreaterThan(balanced.riskScore);
    });

    it('should suggest diversification for few assets', () => {
      const result = service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 5000 },
        { symbol: 'ETHUSDT', value: 5000 },
      ]);
      expect(
        result.suggestions.some((s) => s.toLowerCase().includes('diversif')),
      ).toBe(true);
    });

    it('should suggest reducing crypto for crypto-heavy portfolio', () => {
      const result = service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 8000 },
        { symbol: 'ETHUSDT', value: 2000 },
      ]);
      expect(
        result.suggestions.some((s) => s.toLowerCase().includes('crypto')),
      ).toBe(true);
    });

    it('should cap risk score at 100', () => {
      const result = service.analyzePortfolio([
        { symbol: 'BTCUSDT', value: 10000 },
      ]);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should suggest rebalancing when single asset exceeds 50%', () => {
      const result = service.analyzePortfolio([
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

    it('should show well-diversified message when portfolio is healthy', () => {
      const result = service.analyzePortfolio([
        { symbol: 'AAPL', value: 2500 },
        { symbol: 'TSLA', value: 2500 },
        { symbol: 'NVDA', value: 2500 },
        { symbol: 'GOOG', value: 2500 },
      ]);
      expect(
        result.suggestions.some((s) => s.includes('well-diversified')),
      ).toBe(true);
    });

    it('should compute correct diversification for two equal assets', () => {
      const result = service.analyzePortfolio([
        { symbol: 'AAPL', value: 5000 },
        { symbol: 'TSLA', value: 5000 },
      ]);
      // HHI = 2 * (0.5)^2 = 0.5, diversificationScore = (1-0.5)*100 = 50
      expect(result.diversificationScore).toBe(50);
    });

    it('should count stock-only portfolio with lower risk than crypto', () => {
      const stockOnly = service.analyzePortfolio([
        { symbol: 'AAPL', value: 5000 },
        { symbol: 'TSLA', value: 5000 },
      ]);
      // cryptoWeight = 0, riskScore = 30 + 0*60 + (1 - 50/100)*10 = 30 + 5 = 35
      expect(stockOnly.riskScore).toBe(35);
    });

    it('should identify crypto symbols that contain known crypto tickers', () => {
      // The service checks if symbol includes the crypto ticker (without USDT)
      const result = service.analyzePortfolio([
        { symbol: 'BTC-PERP', value: 10000 },
      ]);
      // BTC-PERP includes 'BTC' which matches BTCUSDT.replace('USDT','') = 'BTC'
      // So cryptoWeight = 1, riskScore = 30 + 1*60 + (1 - 0/100)*10 = 100
      expect(result.riskScore).toBe(100);
    });
  });
});
