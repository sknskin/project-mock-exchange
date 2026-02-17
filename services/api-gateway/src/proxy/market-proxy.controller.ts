import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller('api/market')
export class MarketProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('assets')
  async getAssets(@Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/market/assets',
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prices')
  async getPrices(@Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/market/prices',
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prices/:symbol')
  async getPrice(@Param('symbol') symbol: string, @Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: `/market/prices/${symbol}`,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prices/:symbol/history')
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
