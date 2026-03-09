/**
 * @file 카피 트레이딩 컨트롤러
 * @description 카피 트레이딩 시작/중지/설정/조회 API 엔드포인트
 *
 * @file Copy Trading Controller
 * @description API endpoints for copy trading start/stop/config/retrieval
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { CopyTradeService } from '../../domain/services/copy-trade.service';
import { StartCopyTradeDto, UpdateCopyTradeDto } from '../dto/copy-trade.dto';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('portfolio/copy-trade')
export class CopyTradeController {
  constructor(private readonly copyTradeService: CopyTradeService) {}

  /** 카피 트레이딩을 시작합니다
   * Start copy trading */
  @Post('start')
  async startCopyTrading(
    @Headers('x-user-id') userId: string,
    @Body() dto: StartCopyTradeDto,
  ) {
    this.validateUserId(userId);
    const config = await this.copyTradeService.startCopyTrading(userId, dto.traderId, {
      scaleRatio: dto.scaleRatio,
      maxInvestment: dto.maxInvestment,
      stopLossPercent: dto.stopLossPercent,
    });
    return { success: true, data: config };
  }

  /** 카피 트레이딩 설정을 업데이트합니다
   * Update copy trading configuration */
  @Put('config/:traderId')
  async updateConfig(
    @Headers('x-user-id') userId: string,
    @Param('traderId') traderId: string,
    @Body() dto: UpdateCopyTradeDto,
  ) {
    this.validateUserId(userId);
    const config = await this.copyTradeService.updateConfig(userId, traderId, {
      scaleRatio: dto.scaleRatio,
      maxInvestment: dto.maxInvestment,
      stopLossPercent: dto.stopLossPercent,
    });
    return { success: true, data: config };
  }

  /** 카피 트레이딩을 중지합니다 (소프트 삭제)
   * Stop copy trading (soft delete) */
  @Post('stop/:traderId')
  async stopCopyTrading(
    @Headers('x-user-id') userId: string,
    @Param('traderId') traderId: string,
  ) {
    this.validateUserId(userId);
    const config = await this.copyTradeService.stopCopyTrading(userId, traderId);
    return { success: true, data: config };
  }

  /** 모든 카피 트레이딩 설정 목록을 조회합니다
   * Get all copy trading configurations */
  @Get('status')
  async getMyConfigs(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    const configs = await this.copyTradeService.getMyConfigs(userId);
    return { success: true, data: configs };
  }

  /** 특정 트레이더에 대한 카피 트레이딩 설정을 조회합니다
   * Get copy trading config for a specific trader */
  @Get('status/:traderId')
  async getConfig(
    @Headers('x-user-id') userId: string,
    @Param('traderId') traderId: string,
  ) {
    this.validateUserId(userId);
    const config = await this.copyTradeService.getConfig(userId, traderId);
    return { success: true, data: config };
  }

  /** 카피 트레이딩 실행 내역을 조회합니다
   * Get copy trade execution history */
  @Get('history')
  async getExecutionHistory(
    @Headers('x-user-id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.validateUserId(userId);

    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const history = await this.copyTradeService.getExecutionHistory(
      userId,
      parsedPage,
      parsedLimit,
    );
    return { success: true, data: history };
  }

  private validateUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }
  }
}
