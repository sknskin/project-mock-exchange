/**
 * @file AI 프록시 컨트롤러
 * @description API Gateway에서 AI Service로 분석 요청을 프록시합니다
 *
 * @file AI Proxy Controller
 * @description Proxies analysis requests from API Gateway to AI Service
 */
import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// AI 분석 요청은 비용이 높으므로 인증 필수 + 1분당 10회 제한
// AI analysis requests are costly — require authentication + limit to 10 requests per minute
@ApiTags('AI')
@ApiBearerAuth()
@Controller('api/ai')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 10 } })
export class AiProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /** AI 매매 시그널 조회를 ai-service로 프록시 — 인증 필수
   * Proxy AI trading signals to ai-service — authentication required */
  @Get('signals')
  @ApiOperation({ summary: 'AI 매매 시그널 조회', description: 'AI 기반 매매 시그널을 반환합니다' })
  @ApiResponse({ status: 200, description: '시그널 목록 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getSignals(@Req() _req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('ai-service', {
      method: 'GET',
      url: '/analysis/signals',
    });
    return res.status(result.status).json(result.data);
  }

  /** 포트폴리오 AI 분석 요청을 ai-service로 프록시
   * Proxy portfolio AI analysis to ai-service */
  @Post('portfolio-analysis')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '포트폴리오 AI 분석', description: '포트폴리오 보유 현황을 AI로 분석합니다' })
  @ApiResponse({ status: 200, description: '분석 결과 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async analyzePortfolio(@Req() req: Request, @Body() body: unknown, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('ai-service', {
      method: 'POST',
      url: '/analysis/portfolio',
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 뉴스 AI 요약 요청을 ai-service로 프록시 — 인증 필수
   * Proxy news AI summary to ai-service — authentication required */
  @Post('news-summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: '뉴스 AI 요약', description: '카테고리별 24시간 뉴스를 AI로 분석합니다' })
  @ApiResponse({ status: 200, description: '뉴스 요약 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async summarizeNews(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('ai-service', {
      method: 'POST',
      url: '/analysis/news-summary',
      data: body,
      timeout: 30000,
    });
    return res.status(result.status).json(result.data);
  }
}
