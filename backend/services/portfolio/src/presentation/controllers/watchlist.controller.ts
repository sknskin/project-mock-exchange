import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { WatchlistService } from '../../domain/services/watchlist.service';

@Controller('portfolio/watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async getWatchlist(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    const symbols = await this.watchlistService.getWatchlist(userId);
    return { success: true, data: symbols };
  }

  @Post(':symbol')
  async addSymbol(
    @Headers('x-user-id') userId: string,
    @Param('symbol') symbol: string,
  ) {
    this.validateUserId(userId);
    await this.watchlistService.addSymbol(userId, symbol.toUpperCase());
    return { success: true };
  }

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
