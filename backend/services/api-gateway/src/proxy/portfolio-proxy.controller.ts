import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('deposit')
  async deposit(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'POST',
      url: '/portfolio/deposit',
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('balance')
  async getBalance(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/balance',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('holdings')
  async getHoldings(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/holdings',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('summary')
  async getSummary(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/summary',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('valuation')
  async getValuation(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/valuation',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/leaderboard',
      params: { limit },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('transactions')
  async getTransactions(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/transactions',
      params: { limit, offset },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }
}
