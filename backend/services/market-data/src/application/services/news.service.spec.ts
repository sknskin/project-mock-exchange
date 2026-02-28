import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

const mockPrisma = {
  news: {
    upsert: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  newsScrapeLog: {
    upsert: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  },
};

describe('NewsService', () => {
  let service: NewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated news items', async () => {
      const mockItems = [
        { id: '1', title: 'Bitcoin rises', category: 'CRYPTO' },
        { id: '2', title: 'ETH update', category: 'CRYPTO' },
      ];
      mockPrisma.news.findMany.mockResolvedValue(mockItems);
      mockPrisma.news.count.mockResolvedValue(10);

      const result = await service.list('CRYPTO', 1, 20);

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.news.findMany.mockResolvedValue([]);
      mockPrisma.news.count.mockResolvedValue(55);

      const result = await service.list('DOMESTIC_STOCK', 1, 20);

      expect(result.totalPages).toBe(3);
    });

    it('should apply correct skip for pagination', async () => {
      mockPrisma.news.findMany.mockResolvedValue([]);
      mockPrisma.news.count.mockResolvedValue(0);

      await service.list('FOREIGN_STOCK', 3, 10);

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('getScrapeStatus', () => {
    it('should return all scrape logs', async () => {
      const mockLogs = [
        { category: 'CRYPTO', scrapedAt: new Date(), count: 15 },
        { category: 'DOMESTIC_STOCK', scrapedAt: new Date(), count: 8 },
      ];
      mockPrisma.newsScrapeLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getScrapeStatus();

      expect(result).toEqual(mockLogs);
    });
  });

  describe('scrapeByCategory', () => {
    it('should upsert scrape log after scraping', async () => {
      // RSS parser will fail since feeds are not real, but scrapeByCategory should still update log
      await service.scrapeByCategory('CRYPTO');

      expect(mockPrisma.newsScrapeLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'CRYPTO' },
        }),
      );
    });
  });
});
