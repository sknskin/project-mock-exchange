/**
 * @file AI 분석 서비스 — Google Gemini API 연동
 * @description Gemini AI를 활용한 실시간 매매 시그널 및 포트폴리오 분석
 *
 * @file AI Analysis Service — Google Gemini API Integration
 * @description Real-time market signals and portfolio analysis powered by Gemini AI
 *
 * TODO: 추후 Anthropic/OpenAI 유료 API로 전환 예정
 * TODO: Future migration to Anthropic/OpenAI paid API planned
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private readonly logger = new Logger(AnalysisService.name);
  private readonly model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']> | null;
  private readonly isAiEnabled: boolean;

  // 캐시: 시그널은 1시간마다 갱신 / Cache: signals refresh every 1 hour
  private signalCache: { data: MarketSignal[]; expiry: number } | null = null;
  private readonly SIGNAL_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      this.isAiEnabled = true;
      this.logger.log('Gemini AI enabled (gemini-2.0-flash)');
    } else {
      this.model = null;
      this.isAiEnabled = false;
      this.logger.warn('Gemini API key not set — falling back to rule-based analysis');
    }
  }

  /**
   * 매매 시그널 생성 — Gemini AI 분석 또는 규칙 기반 폴백
   * Generate market signals — Gemini AI analysis or rule-based fallback
   */
  async getMarketSignals(): Promise<MarketSignal[]> {
    // 캐시 확인 / Check cache
    if (this.signalCache && Date.now() < this.signalCache.expiry) {
      return this.signalCache.data;
    }

    if (this.isAiEnabled) {
      try {
        const signals = await this.getGeminiMarketSignals();
        this.signalCache = { data: signals, expiry: Date.now() + this.SIGNAL_CACHE_TTL };
        return signals;
      } catch (error) {
        this.logger.error(`Gemini API error: ${error instanceof Error ? error.message : 'unknown'}`);
        // AI 실패 시 규칙 기반 폴백 / Fall back to rule-based on AI failure
      }
    }

    const fallback = this.getRuleBasedSignals();
    this.signalCache = { data: fallback, expiry: Date.now() + this.SIGNAL_CACHE_TTL };
    return fallback;
  }

  /**
   * Gemini AI를 활용한 매매 시그널 생성
   * Generate market signals using Gemini AI
   */
  private async getGeminiMarketSignals(): Promise<MarketSignal[]> {
    const assets = [
      { symbol: 'BTCUSDT', name: 'Bitcoin' },
      { symbol: 'ETHUSDT', name: 'Ethereum' },
      { symbol: 'SOLUSDT', name: 'Solana' },
      { symbol: 'AAPL', name: 'Apple' },
      { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'NVDA', name: 'NVIDIA' },
    ];

    const prompt = `You are a financial analyst AI for a virtual trading platform.
Analyze the following assets and provide trading signals.

Assets: ${assets.map(a => `${a.symbol} (${a.name})`).join(', ')}

For each asset, provide a JSON response with this exact format (no markdown, no code blocks, pure JSON array):
[
  {
    "symbol": "BTCUSDT",
    "signal": "BUY",
    "confidence": 72,
    "reason": "Brief 1-sentence analysis reason",
    "targetPrice": 98000,
    "stopLoss": 90000,
    "riskLevel": "MEDIUM"
  }
]

Rules:
- signal must be one of: STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
- confidence: 50-95 (integer)
- reason: concise, max 80 characters, in English
- targetPrice and stopLoss: realistic numbers based on current market conditions
- riskLevel: LOW, MEDIUM, or HIGH
- Return ONLY the JSON array, no other text`;

    const result = await this.model!.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON 파싱 — 코드 블록 래핑 제거 / Parse JSON — strip code block wrapping
    const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonStr) as MarketSignal[];

    // 유효성 검증 / Validate
    const validSignals: MarketSignal['signal'][] = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
    const validRisks: MarketSignal['riskLevel'][] = ['LOW', 'MEDIUM', 'HIGH'];

    return parsed
      .filter(s =>
        s.symbol && validSignals.includes(s.signal) && validRisks.includes(s.riskLevel) &&
        typeof s.confidence === 'number' && s.confidence >= 0 && s.confidence <= 100 &&
        typeof s.targetPrice === 'number' && typeof s.stopLoss === 'number' &&
        typeof s.reason === 'string',
      )
      .map(s => ({
        symbol: s.symbol,
        signal: s.signal,
        confidence: Math.round(s.confidence),
        reason: s.reason.slice(0, 120),
        targetPrice: Number(s.targetPrice.toFixed(2)),
        stopLoss: Number(s.stopLoss.toFixed(2)),
        riskLevel: s.riskLevel,
      }));
  }

  /**
   * 포트폴리오 분석 — Gemini AI 분석 또는 규칙 기반 폴백
   * Portfolio analysis — Gemini AI or rule-based fallback
   */
  async analyzePortfolio(holdings: { symbol: string; value: number }[]): Promise<PortfolioInsight> {
    if (!holdings.length) {
      return {
        diversificationScore: 0,
        riskScore: 0,
        suggestions: ['Start building your portfolio by purchasing assets.'],
      };
    }

    if (this.isAiEnabled) {
      try {
        return await this.getGeminiPortfolioAnalysis(holdings);
      } catch (error) {
        this.logger.error(`Gemini portfolio analysis error: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    return this.getRuleBasedPortfolioAnalysis(holdings);
  }

  /**
   * Gemini AI를 활용한 포트폴리오 분석
   * Analyze portfolio using Gemini AI
   */
  private async getGeminiPortfolioAnalysis(holdings: { symbol: string; value: number }[]): Promise<PortfolioInsight> {
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const holdingSummary = holdings
      .map(h => `${h.symbol}: $${h.value.toFixed(2)} (${((h.value / totalValue) * 100).toFixed(1)}%)`)
      .join('\n');

    const prompt = `You are a portfolio analyst AI. Analyze this portfolio and provide insights.

Portfolio Holdings (Total: $${totalValue.toFixed(2)}):
${holdingSummary}

Respond with ONLY a JSON object (no markdown, no code blocks):
{
  "diversificationScore": 65,
  "riskScore": 45,
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ]
}

Rules:
- diversificationScore: 0-100 (0=all in one asset, 100=perfectly diversified)
- riskScore: 0-100 (0=very safe, 100=very risky)
- suggestions: 2-4 actionable suggestions in English, max 100 chars each
- Return ONLY JSON`;

    const result = await this.model!.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      diversificationScore: Math.round(Math.max(0, Math.min(100, parsed.diversificationScore ?? 0))),
      riskScore: Math.round(Math.max(0, Math.min(100, parsed.riskScore ?? 50))),
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s: unknown) => typeof s === 'string').slice(0, 5).map((s: string) => s.slice(0, 150))
        : ['Portfolio analysis completed.'],
    };
  }

  // ── 규칙 기반 폴백 (Rule-based fallback) ──────────────────────────────

  /**
   * 날짜 기반 시드를 사용한 규칙 기반 매매 시그널 (AI 미사용 시 폴백)
   * Rule-based market signals using date-based seed (fallback when AI unavailable)
   */
  private getRuleBasedSignals(): MarketSignal[] {
    const assets = [
      { symbol: 'BTCUSDT', basePrice: 95000, volatility: 0.05 },
      { symbol: 'ETHUSDT', basePrice: 3200, volatility: 0.06 },
      { symbol: 'SOLUSDT', basePrice: 180, volatility: 0.08 },
      { symbol: 'AAPL', basePrice: 230, volatility: 0.03 },
      { symbol: 'TSLA', basePrice: 380, volatility: 0.07 },
      { symbol: 'NVDA', basePrice: 850, volatility: 0.06 },
    ];

    const daySeed = Math.floor(Date.now() / 86400000);

    return assets.map((asset, i) => {
      const hash = (daySeed + i * 7) % 100;
      const signal: MarketSignal['signal'] =
        hash < 15 ? 'STRONG_BUY' : hash < 35 ? 'BUY' : hash < 65 ? 'HOLD' : hash < 85 ? 'SELL' : 'STRONG_SELL';
      const confidence = 55 + (hash % 40);
      const priceDelta = asset.basePrice * asset.volatility * ((hash % 20 - 10) / 100);
      const targetPrice = +(asset.basePrice + Math.abs(priceDelta) * 2).toFixed(2);
      const stopLoss = +(asset.basePrice - Math.abs(priceDelta) * 1.5).toFixed(2);
      const risk: MarketSignal['riskLevel'] = asset.volatility > 0.06 ? 'HIGH' : asset.volatility > 0.04 ? 'MEDIUM' : 'LOW';

      const reasons: Record<string, string[]> = {
        STRONG_BUY: ['Strong upward momentum detected', 'Volume surge indicates accumulation'],
        BUY: ['Positive trend continuation expected', 'Support level holding strong'],
        HOLD: ['Consolidation phase, wait for breakout', 'Mixed signals, maintain position'],
        SELL: ['Weakening momentum observed', 'Approaching resistance level'],
        STRONG_SELL: ['Bearish reversal pattern detected', 'High volume sell-off expected'],
      };

      return {
        symbol: asset.symbol, signal, confidence,
        reason: reasons[signal][hash % reasons[signal].length],
        targetPrice, stopLoss, riskLevel: risk,
      };
    });
  }

  /**
   * HHI 기반 규칙 포트폴리오 분석 (AI 미사용 시 폴백)
   * HHI-based rule portfolio analysis (fallback when AI unavailable)
   */
  private getRuleBasedPortfolioAnalysis(holdings: { symbol: string; value: number }[]): PortfolioInsight {
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const weights = holdings.map((h) => h.value / totalValue);
    const hhi = weights.reduce((sum, w) => sum + w * w, 0);
    const diversificationScore = Math.round((1 - hhi) * 100);

    const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'];
    const cryptoWeight = holdings
      .filter((h) => cryptoSymbols.some((c) => h.symbol.includes(c.replace('USDT', ''))))
      .reduce((sum, h) => sum + h.value / totalValue, 0);
    const riskScore = Math.round(30 + cryptoWeight * 60 + (1 - diversificationScore / 100) * 10);

    const suggestions: string[] = [];
    if (holdings.length < 3) suggestions.push('Consider diversifying across more assets to reduce risk.');
    if (cryptoWeight > 0.7) suggestions.push('Crypto allocation is high. Consider adding stocks for stability.');
    if (diversificationScore < 40) suggestions.push('Portfolio is concentrated. Spread investments more evenly.');
    const maxWeight = Math.max(...weights);
    if (maxWeight > 0.5) {
      const topHolding = holdings[weights.indexOf(maxWeight)];
      suggestions.push(`${topHolding.symbol} represents ${(maxWeight * 100).toFixed(0)}% of portfolio. Consider rebalancing.`);
    }
    if (suggestions.length === 0) suggestions.push('Portfolio looks well-diversified. Keep monitoring market conditions.');

    return { diversificationScore, riskScore: Math.min(riskScore, 100), suggestions };
  }
}
