import { WatchlistService } from './watchlist.service';

const mockPrisma = {
  watchlist: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('WatchlistService', () => {
  let service: WatchlistService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WatchlistService(mockPrisma as any);
  });

  describe('getWatchlist', () => {
    it('should return symbol list ordered by addedAt desc', async () => {
      mockPrisma.watchlist.findMany.mockResolvedValue([
        { symbol: 'BTC' },
        { symbol: 'ETH' },
        { symbol: 'SOL' },
      ]);

      const result = await service.getWatchlist('user-1');

      expect(result).toEqual(['BTC', 'ETH', 'SOL']);
      expect(mockPrisma.watchlist.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { addedAt: 'desc' },
        select: { symbol: true },
      });
    });

    it('should return empty array when no watchlist items', async () => {
      mockPrisma.watchlist.findMany.mockResolvedValue([]);

      const result = await service.getWatchlist('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('addSymbol', () => {
    it('should upsert symbol to prevent duplicates', async () => {
      mockPrisma.watchlist.upsert.mockResolvedValue({});

      await service.addSymbol('user-1', 'BTC');

      expect(mockPrisma.watchlist.upsert).toHaveBeenCalledWith({
        where: { userId_symbol: { userId: 'user-1', symbol: 'BTC' } },
        create: { userId: 'user-1', symbol: 'BTC' },
        update: {},
      });
    });
  });

  describe('removeSymbol', () => {
    it('should delete matching watchlist entry', async () => {
      mockPrisma.watchlist.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeSymbol('user-1', 'ETH');

      expect(mockPrisma.watchlist.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', symbol: 'ETH' },
      });
    });

    it('should not throw when symbol is not in watchlist', async () => {
      mockPrisma.watchlist.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeSymbol('user-1', 'XRP')).resolves.not.toThrow();
    });
  });
});
