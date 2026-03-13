import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { NewsCategory } from '../../../generated/prisma';
import Parser from 'rss-parser';

interface RssFeedConfig {
  url: string;
  source: string;
  category: NewsCategory;
}

const RSS_FEEDS: RssFeedConfig[] = [
  // 암호화폐 (Cryptocurrency — dedicated crypto sources, no filtering needed)
  {
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    source: 'CoinDesk',
    category: 'CRYPTO',
  },
  {
    url: 'https://cointelegraph.com/rss',
    source: 'CoinTelegraph',
    category: 'CRYPTO',
  },
  {
    url: 'https://decrypt.co/feed',
    source: 'Decrypt',
    category: 'CRYPTO',
  },
  {
    url: 'https://bitcoinmagazine.com/.rss/full/',
    source: 'Bitcoin Magazine',
    category: 'CRYPTO',
  },
  {
    url: 'https://www.theblock.co/rss.xml',
    source: 'The Block',
    category: 'CRYPTO',
  },
  // 국내주식 (Domestic stock — general finance feeds, keyword filtering applied)
  {
    url: 'https://www.hankyung.com/feed/stock',
    source: '한국경제',
    category: 'DOMESTIC_STOCK',
  },
  {
    url: 'https://www.mk.co.kr/rss/30100041/',
    source: '매일경제',
    category: 'DOMESTIC_STOCK',
  },
  {
    url: 'https://biz.chosun.com/svc/rss/www_stock.xml',
    source: '조선비즈',
    category: 'DOMESTIC_STOCK',
  },
  {
    url: 'https://www.sedaily.com/RSS/Stock',
    source: '서울경제',
    category: 'DOMESTIC_STOCK',
  },
  {
    url: 'https://www.edaily.co.kr/rss/RssServiceList.asp?svc=stock',
    source: '이데일리',
    category: 'DOMESTIC_STOCK',
  },
  // 해외주식 (Foreign stock — general finance feeds, keyword filtering applied)
  {
    url: 'https://finance.yahoo.com/news/rssindex',
    source: 'Yahoo Finance',
    category: 'FOREIGN_STOCK',
  },
  {
    url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html',
    source: 'CNBC',
    category: 'FOREIGN_STOCK',
  },
  {
    url: 'https://feeds.marketwatch.com/marketwatch/marketpulse/',
    source: 'MarketWatch',
    category: 'FOREIGN_STOCK',
  },
  {
    url: 'https://www.investing.com/rss/news.rss',
    source: 'Investing.com',
    category: 'FOREIGN_STOCK',
  },
  {
    url: 'https://seekingalpha.com/market_currents.xml',
    source: 'Seeking Alpha',
    category: 'FOREIGN_STOCK',
  },
];

/**
 * 카테고리별 관련성 키워드 (Relevance keywords by category)
 * 전용 소스(crypto)는 필터링 불필요, 일반 소스에서만 적용
 */
const RELEVANCE_KEYWORDS: Record<NewsCategory, RegExp> = {
  CRYPTO:
    /bitcoin|btc|ethereum|eth|crypto|blockchain|defi|nft|token|coin|web3|mining|binance|solana|cardano|ripple|xrp|stablecoin|altcoin|wallet|exchange|거래소|비트코인|이더리움|암호화폐|블록체인|코인|토큰|디파이/i,
  DOMESTIC_STOCK:
    /주식|코스피|코스닥|증시|주가|시장|투자|펀드|etf|배당|실적|매출|영업이익|순이익|상장|ipo|공모|기업|종목|환율|금리|채권|선물|옵션|파생|수익률|증권|거래|시가총액|외국인|기관|개인|공매도|작전|테마주|우량주|배당주|성장주|가치주|지수|반등|하락|상승|급등|급락|stock|market|kospi|kosdaq/i,
  FOREIGN_STOCK:
    /stock|market|share|invest|fund|etf|earn|revenue|profit|dividend|nyse|nasdaq|s&p|dow|trading|bond|treasury|fed|interest rate|wall street|bull|bear|ipo|merger|acquisition|sector|index|portfolio|forex|commodity|oil|gold|equity|rally|crash|surge|plunge|quarter|fiscal|yield|inflation|gdp/i,
};

/** HTML 태그 제거 + 엔티티 디코드 (Strip HTML tags and decode entities) */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 전용 금융 소스 — 필터링 생략 (Dedicated finance sources — skip filtering) */
const SKIP_FILTER_SOURCES = new Set([
  'CoinDesk',
  'CoinTelegraph',
  'Decrypt',
  'Bitcoin Magazine',
  'The Block',
]);

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly logger = new Logger(NewsService.name);
  private isScraping = false;
  private readonly parser = new Parser({
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; VirtuEx/1.0)',
    },
  });

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Starting initial news scrape...');
    this.isScraping = true;
    try {
      await this.scrapeAll();
    } finally {
      this.isScraping = false;
    }
  }

  /** 30분마다 실행되는 예약 뉴스 스크래핑
   * Scheduled news scraping every 30 minutes */
  @Interval(30 * 60 * 1000)
  async scheduledScrape() {
    if (this.isScraping) {
      this.logger.warn('Previous scrape still in progress, skipping');
      return;
    }
    this.logger.log('Running scheduled news scrape...');
    this.isScraping = true;
    try {
      await this.scrapeAll();
    } finally {
      this.isScraping = false;
    }
  }

  /** 모든 카테고리의 뉴스를 병렬로 스크래핑합니다
   * Scrape news for all categories in parallel */
  async scrapeAll() {
    const categories: NewsCategory[] = [
      'CRYPTO',
      'DOMESTIC_STOCK',
      'FOREIGN_STOCK',
    ];
    await Promise.allSettled(
      categories.map((cat) => this.scrapeByCategory(cat)),
    );
  }

  /** 특정 카테고리의 RSS 피드를 스크래핑하고 DB에 저장합니다 (동시 3개 피드 제한)
   * Scrape RSS feeds for a category and save to database (max 3 concurrent feeds) */
  async scrapeByCategory(category: NewsCategory) {
    const feeds = RSS_FEEDS.filter((f) => f.category === category);
    let totalInserted = 0;

    // 동시 요청 수를 3개로 제한하여 외부 서버 과부하 방지
    // Limit to 3 concurrent requests to avoid overwhelming external servers
    const CONCURRENCY = 3;
    for (let i = 0; i < feeds.length; i += CONCURRENCY) {
      const batch = feeds.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((feed) => this.scrapeFeed(feed, category)));
      for (const result of results) {
        if (result.status === 'fulfilled') totalInserted += result.value;
      }
    }

    // 스크래핑 로그 업데이트 (Update scrape log)
    await this.prisma.newsScrapeLog.upsert({
      where: { category },
      update: { scrapedAt: new Date(), count: totalInserted },
      create: { category, scrapedAt: new Date(), count: totalInserted },
    });

    this.logger.log(
      `Scraped ${totalInserted} items for category: ${category}`,
    );
    return totalInserted;
  }

  /** 개별 RSS 피드를 스크래핑합니다
   * Scrape a single RSS feed */
  private async scrapeFeed(feed: RssFeedConfig, category: NewsCategory): Promise<number> {
    let inserted = 0;
    const RELEVANCE = RELEVANCE_KEYWORDS[category];
    const skipFilter = SKIP_FILTER_SOURCES.has(feed.source);

    try {
      const parsed = await this.parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, 50);

      for (const item of items) {
        if (!item.link || !item.title) continue;

        if (!skipFilter) {
          const text = `${item.title} ${item.contentSnippet || ''}`;
          if (!RELEVANCE.test(text)) continue;
        }

        try {
          const safeTitle = stripHtml(item.title);
          const safeSummary = item.contentSnippet
            ? stripHtml(item.contentSnippet).slice(0, 500)
            : null;

          await this.prisma.news.upsert({
            where: { sourceUrl: item.link },
            update: {
              title: safeTitle,
              summary: safeSummary,
              publishedAt: item.pubDate ? new Date(item.pubDate) : null,
              scrapedAt: new Date(),
            },
            create: {
              category,
              title: safeTitle,
              summary: safeSummary,
              sourceUrl: item.link,
              source: feed.source,
              imageUrl: item.enclosure?.url || null,
              publishedAt: item.pubDate ? new Date(item.pubDate) : null,
            },
          });
          inserted++;
        } catch (e) {
          this.logger.warn(`News item processing failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scrape ${feed.source} (${feed.url}): ${error}`);
    }
    return inserted;
  }

  /** 카테고리별 뉴스 목록을 페이징하여 조회합니다
   * Get paginated news list by category */
  async list(category: NewsCategory, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.news.findMany({
        where: { category },
        orderBy: { scrapedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.news.count({ where: { category } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** 카테고리별 스크래핑 로그 상태를 조회합니다
   * Get scrape status logs for all categories */
  async getScrapeStatus() {
    const logs = await this.prisma.newsScrapeLog.findMany();
    return logs;
  }
}
