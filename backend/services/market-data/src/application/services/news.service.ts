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
  // 암호화폐
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
  // 국내주식
  {
    url: 'https://www.hankyung.com/feed/stock',
    source: '한국경제',
    category: 'DOMESTIC_STOCK',
  },
  {
    url: 'https://www.mk.co.kr/rss/30000001/',
    source: '매일경제',
    category: 'DOMESTIC_STOCK',
  },
  {
    url: 'https://biz.chosun.com/svc/rss/www_stock.xml',
    source: '조선비즈',
    category: 'DOMESTIC_STOCK',
  },
  {
    url: 'https://www.sedaily.com/RSS/Economy',
    source: '서울경제',
    category: 'DOMESTIC_STOCK',
  },
  {
    url: 'https://www.edaily.co.kr/rss/RssServiceList.asp?svc=stock',
    source: '이데일리',
    category: 'DOMESTIC_STOCK',
  },
  // 해외주식
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
    url: 'https://feeds.marketwatch.com/marketwatch/topstories/',
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

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly logger = new Logger(NewsService.name);
  private readonly parser = new Parser({
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; VirtuEx/1.0)',
    },
  });

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Starting initial news scrape...');
    await this.scrapeAll();
  }

  @Interval(30 * 60 * 1000)
  async scheduledScrape() {
    this.logger.log('Running scheduled news scrape...');
    await this.scrapeAll();
  }

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

  async scrapeByCategory(category: NewsCategory) {
    const feeds = RSS_FEEDS.filter((f) => f.category === category);
    let totalInserted = 0;

    for (const feed of feeds) {
      try {
        const parsed = await this.parser.parseURL(feed.url);
        const items = (parsed.items || []).slice(0, 50);

        for (const item of items) {
          if (!item.link || !item.title) continue;

          try {
            await this.prisma.news.upsert({
              where: { sourceUrl: item.link },
              update: {
                title: item.title.trim(),
                summary: item.contentSnippet?.trim().slice(0, 500) || null,
                publishedAt: item.pubDate
                  ? new Date(item.pubDate)
                  : null,
                scrapedAt: new Date(),
              },
              create: {
                category,
                title: item.title.trim(),
                summary: item.contentSnippet?.trim().slice(0, 500) || null,
                sourceUrl: item.link,
                source: feed.source,
                imageUrl: item.enclosure?.url || null,
                publishedAt: item.pubDate
                  ? new Date(item.pubDate)
                  : null,
              },
            });
            totalInserted++;
          } catch {
            // 개별 아이템 실패 시 건너뛰기 (Skip on individual item failure)
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to scrape ${feed.source} (${feed.url}): ${error}`,
        );
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

  async getScrapeStatus() {
    const logs = await this.prisma.newsScrapeLog.findMany();
    return logs;
  }
}
