/**
 * @file AI 분석 서비스 — Google Gemini + Groq API 연동
 * @description Gemini AI(매매 시그널/포트폴리오) + Groq(뉴스 분석) 이중 AI 서비스
 *
 * @file AI Analysis Service — Google Gemini + Groq API Integration
 * @description Dual AI service: Gemini (signals/portfolio) + Groq (news analysis)
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

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
  // Groq 클라이언트 — 뉴스 분석 전용 / Groq client — news analysis only
  private readonly groqClient: OpenAI | null;
  private readonly isGroqEnabled: boolean;

  // 캐시: 시그널은 1시간마다 갱신 / Cache: signals refresh every 1 hour
  private signalCache: { data: MarketSignal[]; expiry: number } | null = null;
  private readonly SIGNAL_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(private readonly configService: ConfigService) {
    // Gemini — 매매 시그널/포트폴리오 분석용 / Gemini — for signals/portfolio
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      this.isAiEnabled = true;
      this.logger.log('Gemini AI enabled (gemini-2.0-flash)');
    } else {
      this.model = null;
      this.isAiEnabled = false;
      this.logger.warn('Gemini API key not set — falling back to rule-based analysis');
    }

    // Groq — 뉴스 분석용 (Qwen3 모델, 한국어 지원) / Groq — for news analysis (Qwen3 model, Korean support)
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (groqKey) {
      this.groqClient = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
      this.isGroqEnabled = true;
      this.logger.log('Groq AI enabled (qwen/qwen3-32b) for news analysis');
    } else {
      this.groqClient = null;
      this.isGroqEnabled = false;
      this.logger.warn('GROQ_API_KEY not set — news analysis will use Gemini or rule-based fallback');
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

  /**
   * 뉴스 AI 요약 — Grok(우선) → Gemini(폴백) → 규칙 기반(최종 폴백)
   * News AI summary — Grok (primary) → Gemini (fallback) → rule-based (final fallback)
   */
  async summarizeNews(category: string, newsItems: { title: string; summary: string | null; source: string; publishedAt: string | null }[], locale: string = 'ko'): Promise<{ summary: string; highlights: string[]; sentiment: string; sectionAnalysis?: { title: string; content: string }[]; marketOutlook?: string; riskFactors?: string[] }> {
    if (!newsItems.length) {
      return { summary: locale === 'ko' ? '분석할 최근 뉴스가 없습니다.' : 'No recent news available for analysis.', highlights: [], sentiment: 'NEUTRAL' };
    }

    // 1순위: Groq (Llama) / Primary: Groq (Llama)
    if (this.isGroqEnabled) {
      try {
        return await this.getGroqNewsSummary(category, newsItems, locale);
      } catch (error) {
        this.logger.error(`Groq news summary error: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    // 2순위: Gemini / Secondary: Gemini
    if (this.isAiEnabled) {
      try {
        return await this.getGeminiNewsSummary(category, newsItems, locale);
      } catch (error) {
        this.logger.error(`Gemini news summary error: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    return this.getRuleBasedNewsSummary(category, newsItems, locale);
  }

  /**
   * Groq (Llama) 를 활용한 뉴스 요약
   * Generate news summary using Groq (Llama)
   */
  private async getGroqNewsSummary(
    category: string,
    newsItems: { title: string; summary: string | null; source: string; publishedAt: string | null }[],
    locale: string = 'ko',
  ): Promise<{ summary: string; highlights: string[]; sentiment: string; sectionAnalysis?: { title: string; content: string }[]; marketOutlook?: string; riskFactors?: string[] }> {
    const categoryLabel = category === 'CRYPTO' ? 'Cryptocurrency' : category === 'DOMESTIC_STOCK' ? 'Korean Stocks' : 'Global Stocks';
    const sanitize = (s: string) => s.replace(/[\r\n\t]/g, ' ').slice(0, 300);
    const newsList = newsItems.slice(0, 50).map((n, i) => `${i + 1}. [${sanitize(n.source)}] ${sanitize(n.title)}${n.summary ? ` — ${sanitize(n.summary)}` : ''}`).join('\n');
    const lang = locale === 'ko' ? 'Korean' : 'English';

    const response = await this.groqClient!.chat.completions.create({
      model: 'qwen/qwen3-32b',
      messages: [
        {
          role: 'system',
          content: `You are a senior financial analyst at a major investment bank. Provide extremely detailed, in-depth market analysis. Respond with ONLY a JSON object, no markdown, no code blocks, no thinking tags.`,
        },
        {
          role: 'user',
          content: `Perform a comprehensive, in-depth analysis of the following ${categoryLabel} news from the last 24 hours. Write as much detail as possible — this will be read by professional investors.

News articles:
${newsList}

Respond with ONLY a JSON object:
{
  "summary": "Comprehensive executive summary (8-12 sentences) covering all major market movements, key catalysts, institutional activity, regulatory developments, and technical factors. Must be in ${lang}.",
  "highlights": ["Detailed key point 1", "Detailed key point 2", "...up to 10 points"],
  "sentiment": "BULLISH",
  "sectionAnalysis": [
    {
      "title": "Section title (e.g., Market Trends, Regulatory Impact, Technical Analysis, Sector Breakdown, Institutional Flows)",
      "content": "Detailed multi-paragraph analysis (5-10 sentences per section). Cover causes, implications, historical context, and future projections. Must be in ${lang}."
    }
  ],
  "marketOutlook": "Detailed forward-looking market outlook (5-8 sentences). Include short-term (1-2 weeks), medium-term (1-3 months) perspectives, key levels to watch, and potential catalysts. Must be in ${lang}.",
  "riskFactors": ["Detailed risk factor 1 with explanation", "...up to 8 risk factors"]
}

Rules:
- ALL text content must be in ${lang}
- summary: 8-12 sentences minimum, comprehensive executive overview
- highlights: 8-10 detailed bullet points (each 30-80 chars)
- sentiment: one of BULLISH, BEARISH, NEUTRAL, MIXED
- sectionAnalysis: 4-6 sections, each with 5-10 sentences of deep analysis
- marketOutlook: detailed forward-looking analysis with specific levels and timeframes
- riskFactors: 5-8 specific risk factors with explanations (each 30-100 chars)
- Write with the depth and detail expected in a professional investment research report
- Return ONLY the JSON object, nothing else`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    let text = (response.choices[0]?.message?.content ?? '').trim();
    // Qwen 모델의 <think> 태그 제거 / Strip Qwen model's <think> tags
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    this.logger.log(`Groq raw response length: ${text.length}`);
    const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    const validSentiments = ['BULLISH', 'BEARISH', 'NEUTRAL', 'MIXED'];
    return {
      summary: typeof parsed.summary === 'string' && parsed.summary.length > 0 ? parsed.summary.slice(0, 2000) : 'Analysis completed.',
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter((h: unknown) => typeof h === 'string' && (h as string).length > 0).slice(0, 10).map((h: string) => h.slice(0, 120))
        : [],
      sentiment: validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'NEUTRAL',
      sectionAnalysis: Array.isArray(parsed.sectionAnalysis)
        ? parsed.sectionAnalysis
            .filter((s: any) => typeof s?.title === 'string' && typeof s?.content === 'string' && s.content.length > 0)
            .slice(0, 8)
            .map((s: any) => ({ title: s.title.slice(0, 100), content: s.content.slice(0, 3000) }))
        : undefined,
      marketOutlook: typeof parsed.marketOutlook === 'string' && parsed.marketOutlook.length > 0 ? parsed.marketOutlook.slice(0, 2000) : undefined,
      riskFactors: Array.isArray(parsed.riskFactors)
        ? parsed.riskFactors.filter((r: unknown) => typeof r === 'string' && (r as string).length > 0).slice(0, 8).map((r: string) => r.slice(0, 150))
        : undefined,
    };
  }

  /**
   * Gemini AI를 활용한 뉴스 요약
   * Generate news summary using Gemini AI
   */
  private async getGeminiNewsSummary(
    category: string,
    newsItems: { title: string; summary: string | null; source: string; publishedAt: string | null }[],
    locale: string = 'ko',
  ): Promise<{ summary: string; highlights: string[]; sentiment: string }> {
    const categoryLabel = category === 'CRYPTO' ? 'Cryptocurrency' : category === 'DOMESTIC_STOCK' ? 'Korean Stocks' : 'Global Stocks';
    // 프롬프트 인젝션 방지: 제목/요약에서 제어 문자 제거 / Strip control chars to prevent prompt injection
    const sanitize = (s: string) => s.replace(/[\r\n\t]/g, ' ').slice(0, 200);
    const newsList = newsItems.slice(0, 30).map((n, i) => `${i + 1}. [${sanitize(n.source)}] ${sanitize(n.title)}${n.summary ? ` — ${sanitize(n.summary)}` : ''}`).join('\n');
    const lang = locale === 'ko' ? 'Korean' : 'English';

    const prompt = `You are a financial news analyst. Analyze the following ${categoryLabel} news from the last 24 hours and provide a market summary.

News articles:
${newsList}

Respond with ONLY a JSON object (no markdown, no code blocks):
{
  "summary": "2-4 sentence comprehensive market summary in ${lang}. Cover key trends, major events, and overall market direction.",
  "highlights": ["Key point 1", "Key point 2", "Key point 3"],
  "sentiment": "BULLISH"
}

Rules:
- summary: Must be in ${lang}, 2-4 sentences, comprehensive market overview
- highlights: 3-5 key bullet points in ${lang}, max 60 chars each
- sentiment: one of BULLISH, BEARISH, NEUTRAL, MIXED
- Focus on market impact and investor implications
- Return ONLY JSON`;

    const result = await this.model!.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    const validSentiments = ['BULLISH', 'BEARISH', 'NEUTRAL', 'MIXED'];
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : 'Analysis completed.',
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter((h: unknown) => typeof h === 'string').slice(0, 5).map((h: string) => h.slice(0, 80))
        : [],
      sentiment: validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'NEUTRAL',
    };
  }

  /**
   * 규칙 기반 뉴스 요약 (AI 미사용 시 폴백)
   * Rule-based news summary (fallback when AI unavailable)
   */
  private getRuleBasedNewsSummary(
    _category: string,
    newsItems: { title: string; summary: string | null; source: string; publishedAt: string | null }[],
    locale: string = 'ko',
  ): { summary: string; highlights: string[]; sentiment: string } {
    const sourceSet = new Set(newsItems.map((n) => n.source));
    const summary = locale === 'ko'
      ? `최근 24시간 동안 ${sourceSet.size}개 출처에서 ${newsItems.length}건의 뉴스가 수집되었습니다. AI 분석 기능이 비활성화 상태이므로 상세 분석은 제공되지 않습니다.`
      : `${newsItems.length} articles collected from ${sourceSet.size} sources in the last 24 hours. Detailed analysis is unavailable as AI is disabled.`;
    return {
      summary,
      highlights: newsItems.slice(0, 3).map((n) => n.title.slice(0, 60)),
      sentiment: 'NEUTRAL',
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
