/**
 * @file 시장 데이터 컨트롤러
 * @description 시세, 자산 목록, 캔들스틱 등 시장 데이터 API 엔드포인트를 처리합니다
 *
 * @file Market Data Controller
 * @description Handles market data API endpoints: prices, assets, candlesticks
 */
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MarketDataService } from '../../application/services/market-data.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
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

  @Get('prices/period-changes')
  async getPeriodChanges(@Query('period') period: string) {
    const changes = await this.marketDataService.getPeriodChanges(period);
    return { success: true, data: changes };
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
