/**
 * @file 관심종목 컨트롤러
 * @description 사용자별 관심종목 조회/추가/삭제 API
 *
 * @file Watchlist Controller
 * @description API for user watchlist retrieval, addition, and removal
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Headers,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { WatchlistService } from '../../domain/services/watchlist.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('portfolio/watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  /** 관심종목 목록 조회
   * Get watchlist symbols */
  @Get()
  async getWatchlist(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    const symbols = await this.watchlistService.getWatchlist(userId);
    return { success: true, data: symbols };
  }

  /** 관심종목 추가
   * Add symbol to watchlist */
  @Post(':symbol')
  async addSymbol(
    @Headers('x-user-id') userId: string,
    @Param('symbol') symbol: string,
  ) {
    this.validateUserId(userId);
    await this.watchlistService.addSymbol(userId, symbol.toUpperCase());
    return { success: true };
  }

  /** 관심종목 삭제
   * Remove symbol from watchlist */
  @Delete(':symbol')
  async removeSymbol(
    @Headers('x-user-id') userId: string,
    @Param('symbol') symbol: string,
  ) {
    this.validateUserId(userId);
    await this.watchlistService.removeSymbol(userId, symbol.toUpperCase());
    return { success: true };
  }

  private validateUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }
  }
}
