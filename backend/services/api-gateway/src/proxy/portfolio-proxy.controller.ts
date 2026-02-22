/**
 * @file 포트폴리오 프록시 컨트롤러
 * @description API Gateway에서 Portfolio 서비스로 포트폴리오 요청을 프록시합니다
 *
 * @file Portfolio Proxy Controller
 * @description Proxies portfolio requests from API Gateway to Portfolio service
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Portfolio')
@ApiBearerAuth()
@Controller('api/portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('deposit')
  @ApiOperation({ summary: '자금 입금', description: '포트폴리오에 가상 자금을 입금합니다' })
  @ApiResponse({ status: 201, description: '입금 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
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
  @ApiOperation({ summary: '잔고 조회', description: '현재 사용자의 잔고를 반환합니다' })
  @ApiResponse({ status: 200, description: '잔고 정보 반환' })
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
  @ApiOperation({ summary: '보유 자산 조회', description: '현재 사용자의 보유 자산 목록을 반환합니다' })
  @ApiResponse({ status: 200, description: '보유 자산 목록 반환' })
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
  @ApiOperation({ summary: '포트폴리오 요약', description: '총 자산, 수익률 등 포트폴리오 요약 정보를 반환합니다' })
  @ApiResponse({ status: 200, description: '포트폴리오 요약 반환' })
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
  @ApiOperation({ summary: '자산 평가 조회', description: '보유 자산의 현재 평가액을 반환합니다' })
  @ApiResponse({ status: 200, description: '자산 평가 반환' })
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
  @ApiOperation({ summary: '리더보드 조회', description: '수익률 기준 상위 사용자 랭킹을 반환합니다' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수 (기본값: 10)' })
  @ApiResponse({ status: 200, description: '리더보드 반환' })
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
  @ApiOperation({ summary: '거래 내역 조회', description: '입출금 및 매수/매도 거래 내역을 반환합니다' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiQuery({ name: 'offset', required: false, description: '오프셋' })
  @ApiResponse({ status: 200, description: '거래 내역 반환' })
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

  @Get('watchlist')
  @ApiOperation({ summary: '관심종목 조회', description: '관심종목 심볼 목록을 반환합니다' })
  @ApiResponse({ status: 200, description: '관심종목 목록 반환' })
  async getWatchlist(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'GET',
      url: '/portfolio/watchlist',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('watchlist/:symbol')
  @ApiOperation({ summary: '관심종목 추가', description: '종목을 관심종목에 추가합니다' })
  @ApiResponse({ status: 201, description: '관심종목 추가 성공' })
  async addWatchlist(
    @Param('symbol') symbol: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'POST',
      url: `/portfolio/watchlist/${symbol}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Delete('watchlist/:symbol')
  @ApiOperation({ summary: '관심종목 삭제', description: '종목을 관심종목에서 삭제합니다' })
  @ApiResponse({ status: 200, description: '관심종목 삭제 성공' })
  async removeWatchlist(
    @Param('symbol') symbol: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('portfolio', {
      method: 'DELETE',
      url: `/portfolio/watchlist/${symbol}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }
}
