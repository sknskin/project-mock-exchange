/**
 * @file AI 분석 컨트롤러
 * @description 매매 시그널 및 포트폴리오 분석 API 엔드포인트
 *
 * @file AI Analysis Controller
 * @description API endpoints for market signals and portfolio analysis
 */
import { Controller, Get, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('signals')
  getMarketSignals() {
    return this.analysisService.getMarketSignals();
  }

  @Post('portfolio')
  analyzePortfolio(
    @Body() body: { holdings: { symbol: string; value: number }[] },
  ) {
    return this.analysisService.analyzePortfolio(body.holdings ?? []);
  }
}
