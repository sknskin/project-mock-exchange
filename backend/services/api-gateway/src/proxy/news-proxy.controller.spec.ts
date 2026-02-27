import { Test, TestingModule } from '@nestjs/testing';
import { NewsProxyController } from './news-proxy.controller';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

const mockProxyService = {
  forward: jest.fn(),
};

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('NewsProxyController', () => {
  let controller: NewsProxyController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsProxyController],
      providers: [
        { provide: ProxyService, useValue: mockProxyService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NewsProxyController>(NewsProxyController);
  });

  describe('list', () => {
    it('should proxy GET /news with query params', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { success: true, data: [{ title: 'News 1' }] },
      });

      const res = mockRes();
      const req = { query: { category: 'crypto', page: '1' } } as any;
      await controller.list(req, res as Response);

      expect(mockProxyService.forward).toHaveBeenCalledWith('market-data', {
        method: 'GET',
        url: '/news',
        params: { category: 'crypto', page: '1' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('scrapeStatus', () => {
    it('should proxy GET /news/scrape-status', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { isRunning: false },
      });

      const res = mockRes();
      await controller.scrapeStatus(res as Response);

      expect(mockProxyService.forward).toHaveBeenCalledWith('market-data', {
        method: 'GET',
        url: '/news/scrape-status',
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('triggerScrape', () => {
    it('should proxy POST /news/scrape', async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      const res = mockRes();
      const req = { query: {} } as any;
      await controller.triggerScrape(req, res as Response);

      expect(mockProxyService.forward).toHaveBeenCalledWith('market-data', {
        method: 'POST',
        url: '/news/scrape',
        params: {},
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('security: guards applied', () => {
    it('should have JwtAuthGuard on scrapeStatus', () => {
      const guards = Reflect.getMetadata('__guards__', NewsProxyController.prototype.scrapeStatus);
      expect(guards).toBeDefined();
      expect(guards.some((g: any) => g === JwtAuthGuard || g.name === 'JwtAuthGuard')).toBe(true);
    });

    it('should have JwtAuthGuard on triggerScrape', () => {
      const guards = Reflect.getMetadata('__guards__', NewsProxyController.prototype.triggerScrape);
      expect(guards).toBeDefined();
      expect(guards.some((g: any) => g === JwtAuthGuard || g.name === 'JwtAuthGuard')).toBe(true);
    });

    it('should NOT have JwtAuthGuard on list (public)', () => {
      const guards = Reflect.getMetadata('__guards__', NewsProxyController.prototype.list);
      expect(guards).toBeUndefined();
    });
  });
});
