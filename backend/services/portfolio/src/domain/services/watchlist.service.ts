/**
 * @file 관심종목 서비스
 * @description 사용자별 관심종목 CRUD 비즈니스 로직
 *
 * @file Watchlist Service
 * @description Business logic for per-user watchlist CRUD operations
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  /** 관심종목 심볼 목록 조회
   * Retrieve watchlist symbol list */
  async getWatchlist(userId: string): Promise<string[]> {
    const rows = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
      select: { symbol: true },
    });
    return rows.map((r) => r.symbol);
  }

  /** 관심종목 추가 (중복 방지 upsert)
   * Add symbol (upsert to prevent duplicates) */
  async addSymbol(userId: string, symbol: string): Promise<void> {
    await this.prisma.watchlist.upsert({
      where: { userId_symbol: { userId, symbol } },
      create: { userId, symbol },
      update: {},
    });
  }

  /** 관심종목 삭제
   * Remove symbol from watchlist */
  async removeSymbol(userId: string, symbol: string): Promise<void> {
    await this.prisma.watchlist.deleteMany({
      where: { userId, symbol },
    });
  }
}
