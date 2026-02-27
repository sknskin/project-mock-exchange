import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('News')
@Controller('api/news')
export class NewsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  @ApiOperation({ summary: '뉴스 목록 조회', description: '카테고리, 페이지, 개수 기준으로 뉴스 목록을 조회합니다.' })
  @ApiQuery({ name: 'category', required: false, description: '뉴스 카테고리' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiResponse({ status: 200, description: '뉴스 목록 조회 성공' })
  async list(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/news',
      params: req.query,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('scrape-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '스크래핑 상태 조회', description: '뉴스 스크래핑 작업의 현재 상태를 조회합니다. (관리자 전용)' })
  @ApiResponse({ status: 200, description: '스크래핑 상태 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async scrapeStatus(@Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'GET',
      url: '/news/scrape-status',
    });
    return res.status(result.status).json(result.data);
  }

  @Post('scrape')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '뉴스 스크래핑 실행', description: '뉴스 스크래핑 작업을 수동으로 트리거합니다. (관리자 전용)' })
  @ApiResponse({ status: 200, description: '스크래핑 실행 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 500, description: '스크래핑 실행 실패' })
  async triggerScrape(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('market-data', {
      method: 'POST',
      url: '/news/scrape',
      params: req.query,
    });
    return res.status(result.status).json(result.data);
  }
}
