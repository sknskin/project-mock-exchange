import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketDataService } from '../../application/services/market-data.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('assets')
  async getAssets() {
    const assets = await this.marketDataService.getAssets();
    return { success: true, data: assets };
  }

  @Get('prices')
  async getLatestPrices() {
    const prices = await this.marketDataService.getLatestPrices();
    return { success: true, data: prices };
  }

  @Get('prices/:symbol')
  async getPrice(@Param('symbol') symbol: string) {
    const price = await this.marketDataService.getPrice(symbol);
    if (!price) {
      return { success: false, message: `Price not found for ${symbol}` };
    }
    return { success: true, data: price };
  }

  @Get('prices/:symbol/history')
  async getPriceHistory(
    @Param('symbol') symbol: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.marketDataService.getPriceHistory(
      symbol,
      limit ? parseInt(limit, 10) : 100,
    );
    return { success: true, data: history };
  }

  @Get('prices/:symbol/candlesticks')
  async getCandlesticks(
    @Param('symbol') symbol: string,
    @Query('interval') interval = '1m',
    @Query('limit') limit?: string,
  ) {
    const candles = await this.marketDataService.getCandlesticks(
      symbol,
      interval,
      limit ? parseInt(limit, 10) : 100,
    );
    return { success: true, data: candles };
  }
}
