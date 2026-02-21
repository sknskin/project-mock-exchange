import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller('api/news')
export class NewsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  async list(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/news',
      params: req.query,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('scrape-status')
  async scrapeStatus(@Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/news/scrape-status',
    });
    return res.status(result.status).json(result.data);
  }

  @Post('scrape')
  async triggerScrape(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'POST',
      url: '/news/scrape',
      params: req.query,
    });
    return res.status(result.status).json(result.data);
  }
}
