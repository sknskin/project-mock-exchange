/**
 * @file AI 프록시 컨트롤러
 * @description API Gateway에서 AI Service로 분석 요청을 프록시합니다
 *
 * @file AI Proxy Controller
 * @description Proxies analysis requests from API Gateway to AI Service
 */
import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('AI')
@Controller('api/ai')
export class AiProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('signals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 매매 시그널 조회', description: 'AI 기반 매매 시그널을 반환합니다' })
  @ApiResponse({ status: 200, description: '시그널 목록 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getSignals(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('ai-service', {
      method: 'GET',
      url: '/analysis/signals',
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('portfolio-analysis')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '포트폴리오 AI 분석', description: '포트폴리오 보유 현황을 AI로 분석합니다' })
  @ApiResponse({ status: 200, description: '분석 결과 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async analyzePortfolio(@Req() req: Request, @Body() body: any, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('ai-service', {
      method: 'POST',
      url: '/analysis/portfolio',
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }
}
