/**
 * @file AI 분석 모듈
 * @description 분석 서비스와 컨트롤러를 등록합니다
 *
 * @file AI Analysis Module
 * @description Registers analysis service and controller
 */
import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
