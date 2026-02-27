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

    it('should propagate database errors from findMany', async () => {
      mockPrisma.watchlist.findMany.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(service.getWatchlist('user-1')).rejects.toThrow(
        'DB connection lost',
      );
    });

    it('should query with the exact userId passed in', async () => {
      mockPrisma.watchlist.findMany.mockResolvedValue([]);

      await service.getWatchlist('user-abc-123');

      expect(mockPrisma.watchlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-abc-123' },
        }),
      );
    });

    it('should handle a large watchlist', async () => {
      const largeList = Array.from({ length: 100 }, (_, i) => ({
        symbol: `SYM${i}`,
      }));
      mockPrisma.watchlist.findMany.mockResolvedValue(largeList);

      const result = await service.getWatchlist('user-1');

      expect(result).toHaveLength(100);
      expect(result[0]).toBe('SYM0');
      expect(result[99]).toBe('SYM99');
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

    it('should propagate database errors from upsert', async () => {
      mockPrisma.watchlist.upsert.mockRejectedValue(
        new Error('Unique constraint violation'),
      );

      await expect(service.addSymbol('user-1', 'BTC')).rejects.toThrow(
        'Unique constraint violation',
      );
    });

    it('should pass the correct composite key for upsert', async () => {
      mockPrisma.watchlist.upsert.mockResolvedValue({});

      await service.addSymbol('user-2', 'ETHUSDT');

      expect(mockPrisma.watchlist.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_symbol: { userId: 'user-2', symbol: 'ETHUSDT' },
          },
        }),
      );
    });

    it('should return void on successful add', async () => {
      mockPrisma.watchlist.upsert.mockResolvedValue({
        userId: 'user-1',
        symbol: 'BTC',
      });

      const result = await service.addSymbol('user-1', 'BTC');

      expect(result).toBeUndefined();
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

      await expect(
        service.removeSymbol('user-1', 'XRP'),
      ).resolves.not.toThrow();
    });

    it('should propagate database errors from deleteMany', async () => {
      mockPrisma.watchlist.deleteMany.mockRejectedValue(
        new Error('Foreign key constraint failed'),
      );

      await expect(service.removeSymbol('user-1', 'ETH')).rejects.toThrow(
        'Foreign key constraint failed',
      );
    });

    it('should return void on successful removal', async () => {
      mockPrisma.watchlist.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeSymbol('user-1', 'BTC');

      expect(result).toBeUndefined();
    });
  });

  describe('user isolation', () => {
    it('should call findMany with different userId for different users', async () => {
      mockPrisma.watchlist.findMany
        .mockResolvedValueOnce([{ symbol: 'BTC' }])
        .mockResolvedValueOnce([{ symbol: 'ETH' }, { symbol: 'SOL' }]);

      const user1Result = await service.getWatchlist('user-1');
      const user2Result = await service.getWatchlist('user-2');

      expect(user1Result).toEqual(['BTC']);
      expect(user2Result).toEqual(['ETH', 'SOL']);

      expect(mockPrisma.watchlist.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(mockPrisma.watchlist.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: { userId: 'user-2' } }),
      );
    });
  });
});
