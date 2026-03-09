/**
 * @file AI 분석 컨트롤러
 * @description 매매 시그널 및 포트폴리오 분석 API 엔드포인트
 *
 * @file AI Analysis Controller
 * @description API endpoints for market signals and portfolio analysis
 */
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';
import { AnalyzePortfolioDto } from './dto/analyze-portfolio.dto';

@UseGuards(InternalAuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /** 데모 자산에 대한 매매 시그널 조회
   * Get market signals for demo assets */
  @Get('signals')
  getMarketSignals() {
    return this.analysisService.getMarketSignals();
  }

  /** 포트폴리오 보유 현황을 분석하여 인사이트 제공
   * Analyze portfolio holdings and provide insights */
  @Post('portfolio')
  analyzePortfolio(@Body() dto: AnalyzePortfolioDto) {
    return this.analysisService.analyzePortfolio(dto.holdings ?? []);
  }
}
