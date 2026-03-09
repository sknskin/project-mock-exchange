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

  /** 전체 자산 목록 조회
   * Get all available asset list */
  @Get('assets')
  async getAssets() {
    const assets = await this.marketDataService.getAssets();
    return { success: true, data: assets };
  }

  /** 전체 자산의 최신 가격 조회
   * Get latest prices for all assets */
  @Get('prices')
  async getLatestPrices() {
    const prices = await this.marketDataService.getLatestPrices();
    return { success: true, data: prices };
  }

  /** 기간별 가격 등락률 조회
   * Get price changes by period (1d, 1w, 1m, etc.) */
  @Get('prices/period-changes')
  async getPeriodChanges(@Query('period') period: string) {
    const changes = await this.marketDataService.getPeriodChanges(period);
    return { success: true, data: changes };
  }

  /** 특정 심볼의 현재 가격 조회
   * Get current price for a specific symbol */
  @Get('prices/:symbol')
  async getPrice(@Param('symbol') symbol: string) {
    const price = await this.marketDataService.getPrice(symbol);
    if (!price) {
      return { success: false, message: `Price not found for ${symbol}` };
    }
    return { success: true, data: price };
  }

  /** 특정 심볼의 가격 히스토리 조회
   * Get price history for a specific symbol */
  @Get('prices/:symbol/history')
  async getPriceHistory(
    @Param('symbol') symbol: string,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = Math.min(Math.max(1, limit ? parseInt(limit, 10) || 100 : 100), 2000);
    const history = await this.marketDataService.getPriceHistory(symbol, safeLimit);
    return { success: true, data: history };
  }

  /** 특정 심볼의 캔들스틱 데이터 조회
   * Get candlestick data for a specific symbol */
  @Get('prices/:symbol/candlesticks')
  async getCandlesticks(
    @Param('symbol') symbol: string,
    @Query('interval') interval = '1m',
    @Query('limit') limit?: string,
  ) {
    const safeLimit = Math.min(Math.max(1, limit ? parseInt(limit, 10) || 100 : 100), 2000);
    const candles = await this.marketDataService.getCandlesticks(symbol, interval, safeLimit);
    return { success: true, data: candles };
  }
}
