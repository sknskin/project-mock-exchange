/**
 * @file 시장 데이터 프록시 컨트롤러
 * @description API Gateway에서 Market Data 서비스로 시세 요청을 프록시합니다
 *
 * @file Market Proxy Controller
 * @description Proxies market data requests from API Gateway to Market Data service
 */
import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ProxyService } from './proxy.service';

@ApiTags('Market')
@Controller('api/market')
export class MarketProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('assets')
  @ApiOperation({ summary: '자산 목록 조회', description: '거래 가능한 전체 자산(종목) 목록을 반환합니다' })
  @ApiResponse({ status: 200, description: '자산 목록 반환' })
  async getAssets(@Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/market/assets',
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prices')
  @ApiOperation({ summary: '전체 시세 조회', description: '모든 자산의 현재 시세를 반환합니다' })
  @ApiResponse({ status: 200, description: '시세 목록 반환' })
  async getPrices(@Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/market/prices',
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prices/period-changes')
  @ApiOperation({ summary: '기간별 등락률 조회', description: '지정 기간 동안의 가격 변동률을 반환합니다' })
  @ApiQuery({ name: 'period', description: '기간 (1d, 1w, 1m, 3m, 6m, 1y)' })
  @ApiResponse({ status: 200, description: '기간별 등락률 반환' })
  async getPeriodChanges(@Query('period') period: string, @Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/market/prices/period-changes',
      params: { period },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prices/:symbol')
  @ApiOperation({ summary: '개별 종목 시세 조회', description: '특정 자산의 현재 시세를 반환합니다' })
  @ApiParam({ name: 'symbol', description: '자산 심볼 (예: BTC-USD)' })
  @ApiResponse({ status: 200, description: '시세 반환' })
  @ApiResponse({ status: 404, description: '종목 없음' })
  async getPrice(@Param('symbol') symbol: string, @Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: `/market/prices/${symbol}`,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prices/:symbol/history')
  @ApiOperation({ summary: '가격 이력 조회', description: '특정 자산의 가격 이력(틱 데이터)을 반환합니다' })
  @ApiParam({ name: 'symbol', description: '자산 심볼 (예: BTC-USD)' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiResponse({ status: 200, description: '가격 이력 반환' })
  async getPriceHistory(
    @Param('symbol') symbol: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: `/market/prices/${symbol}/history`,
      params: { limit },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prices/:symbol/candlesticks')
  @ApiOperation({ summary: '캔들스틱 조회', description: '특정 자산의 OHLCV 캔들스틱 데이터를 반환합니다' })
  @ApiParam({ name: 'symbol', description: '자산 심볼 (예: BTC-USD)' })
  @ApiQuery({ name: 'interval', description: '캔들 간격 (1m, 5m, 15m, 1h, 4h, 1d)' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiResponse({ status: 200, description: '캔들스틱 데이터 반환' })
  async getCandlesticks(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: `/market/prices/${symbol}/candlesticks`,
      params: { interval, limit },
    });
    return res.status(result.status).json(result.data);
  }
}
