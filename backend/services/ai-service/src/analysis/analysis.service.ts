/**
 * @file AI 분석 서비스
 * @description 규칙 기반 매매 시그널 및 포트폴리오 분석을 제공합니다
 *
 * @file AI Analysis Service
 * @description Provides rule-based market signals and portfolio analysis
 */
import { Injectable } from '@nestjs/common';

export interface MarketSignal {
  symbol: string;
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  reason: string;
  targetPrice: number;
  stopLoss: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PortfolioInsight {
  diversificationScore: number;
  riskScore: number;
  suggestions: string[];
}

@Injectable()
export class AnalysisService {
  /**
   * 날짜 기반 시드를 사용하여 데모 자산에 대한 매매 시그널을 생성합니다
   * Generate market signals for demo assets using date-based seed
   */
  getMarketSignals(): MarketSignal[] {
    const assets = [
      { symbol: 'BTCUSDT', basePrice: 95000, volatility: 0.05 },
      { symbol: 'ETHUSDT', basePrice: 3200, volatility: 0.06 },
      { symbol: 'SOLUSDT', basePrice: 180, volatility: 0.08 },
      { symbol: 'AAPL', basePrice: 230, volatility: 0.03 },
      { symbol: 'TSLA', basePrice: 380, volatility: 0.07 },
      { symbol: 'NVDA', basePrice: 850, volatility: 0.06 },
    ];

    // 날짜 기반 시드: 같은 날에는 동일한 시그널 반환 (일관된 데모 데이터)
    // Date-based seed: returns consistent signals for the same day (stable demo data)
    const daySeed = Math.floor(Date.now() / 86400000);

    return assets.map((asset, i) => {
      const hash = (daySeed + i * 7) % 100;
      const signal =
        hash < 15
          ? 'STRONG_BUY'
          : hash < 35
            ? 'BUY'
            : hash < 65
              ? 'HOLD'
              : hash < 85
                ? 'SELL'
                : 'STRONG_SELL';
      const confidence = 55 + (hash % 40);
      const priceDelta =
        asset.basePrice * asset.volatility * ((hash % 20 - 10) / 100);
      const targetPrice = +(
        asset.basePrice +
        Math.abs(priceDelta) * 2
      ).toFixed(2);
      const stopLoss = +(
        asset.basePrice -
        Math.abs(priceDelta) * 1.5
      ).toFixed(2);
      const risk: 'LOW' | 'MEDIUM' | 'HIGH' =
        asset.volatility > 0.06
          ? 'HIGH'
          : asset.volatility > 0.04
            ? 'MEDIUM'
            : 'LOW';

      const reasons: Record<string, string[]> = {
        STRONG_BUY: [
          'Strong upward momentum detected',
          'Volume surge indicates accumulation',
        ],
        BUY: [
          'Positive trend continuation expected',
          'Support level holding strong',
        ],
        HOLD: [
          'Consolidation phase, wait for breakout',
          'Mixed signals, maintain position',
        ],
        SELL: [
          'Weakening momentum observed',
          'Approaching resistance level',
        ],
        STRONG_SELL: [
          'Bearish reversal pattern detected',
          'High volume sell-off expected',
        ],
      };

      return {
        symbol: asset.symbol,
        signal,
        confidence,
        reason: reasons[signal][hash % reasons[signal].length],
        targetPrice,
        stopLoss,
        riskLevel: risk,
      };
    });
  }

  /**
   * 포트폴리오 보유 현황을 분석하여 분산 점수, 위험 점수, 제안을 반환합니다
   * Analyze portfolio holdings and return diversification score, risk score, suggestions
   */
  analyzePortfolio(
    holdings: { symbol: string; value: number }[],
  ): PortfolioInsight {
    if (!holdings.length) {
      return {
        diversificationScore: 0,
        riskScore: 0,
        suggestions: [
          'Start building your portfolio by purchasing assets.',
        ],
      };
    }

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const weights = holdings.map((h) => h.value / totalValue);

    // HHI (Herfindahl-Hirschman Index) 기반 분산 점수 — 0(모두 하나에 집중)~100(균등 분배)
    // HHI-based diversification score — 0 (all in one asset) to 100 (evenly distributed)
    const hhi = weights.reduce((sum, w) => sum + w * w, 0);
    const diversificationScore = Math.round((1 - hhi) * 100);

    // 암호화폐 비중 기반 위험 평가 — 높은 암호화폐 비중 = 높은 변동성 위험
    // Risk assessment based on crypto allocation — higher crypto weight = higher volatility risk
    const cryptoSymbols = [
      'BTCUSDT',
      'ETHUSDT',
      'SOLUSDT',
      'BNBUSDT',
      'XRPUSDT',
      'ADAUSDT',
      'DOGEUSDT',
    ];
    const cryptoWeight = holdings
      .filter((h) =>
        cryptoSymbols.some((c) =>
          h.symbol.includes(c.replace('USDT', '')),
        ),
      )
      .reduce((sum, h) => sum + h.value / totalValue, 0);
    const riskScore = Math.round(
      30 + cryptoWeight * 60 + (1 - diversificationScore / 100) * 10,
    );

    const suggestions: string[] = [];
    if (holdings.length < 3)
      suggestions.push(
        'Consider diversifying across more assets to reduce risk.',
      );
    if (cryptoWeight > 0.7)
      suggestions.push(
        'Crypto allocation is high. Consider adding stocks for stability.',
      );
    if (diversificationScore < 40)
      suggestions.push(
        'Portfolio is concentrated. Spread investments more evenly.',
      );
    const maxWeight = Math.max(...weights);
    if (maxWeight > 0.5) {
      const topHolding = holdings[weights.indexOf(maxWeight)];
      suggestions.push(
        `${topHolding.symbol} represents ${(maxWeight * 100).toFixed(0)}% of portfolio. Consider rebalancing.`,
      );
    }
    if (suggestions.length === 0)
      suggestions.push(
        'Portfolio looks well-diversified. Keep monitoring market conditions.',
      );

    return {
      diversificationScore,
      riskScore: Math.min(riskScore, 100),
      suggestions,
    };
  }
}
