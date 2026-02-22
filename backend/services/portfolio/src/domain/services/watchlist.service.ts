import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWatchlist(userId: string): Promise<string[]> {
    const rows = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
      select: { symbol: true },
    });
    return rows.map((r) => r.symbol);
  }

  async addSymbol(userId: string, symbol: string): Promise<void> {
    await this.prisma.watchlist.upsert({
      where: { userId_symbol: { userId, symbol } },
      create: { userId, symbol },
      update: {},
    });
  }

  async removeSymbol(userId: string, symbol: string): Promise<void> {
    await this.prisma.watchlist.deleteMany({
      where: { userId, symbol },
    });
  }
}
