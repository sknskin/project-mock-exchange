/**
 * @file 내부 API 컨트롤러
 * @description 다른 마이크로서비스에서 호출하는 내부 포트폴리오 API
 *
 * @file Internal API Controller
 * @description Internal portfolio API called by other microservices
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { BalanceService } from '../../domain/services/balance.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

const SYMBOL_REGEX = /^[A-Z]{2,10}(-USD)?$/;

@ApiTags('Portfolio Internal')
@UseGuards(InternalAuthGuard)
@Controller('portfolio/internal')
export class InternalController {
  constructor(private readonly balanceService: BalanceService) {}

  @Post('reserve')
  @ApiOperation({ summary: '자금 예약', description: '주문 실행을 위해 사용자의 현금을 예약합니다' })
  async reserveFunds(
    @Headers('x-user-id') userId: string,
    @Body() body: { amount: string; orderId?: string },
  ) {
    this.validateUserId(userId);
    const result = await this.balanceService.reserveFunds(
      userId,
      body.amount,
      body.orderId || 'pending',
    );
    return { success: true, data: result };
  }

  @Post('release')
  @ApiOperation({ summary: '자금 해제', description: '예약된 현금을 해제하여 사용 가능한 잔고로 복원합니다' })
  async releaseFunds(
    @Headers('x-user-id') userId: string,
    @Body() body: { amount: string; orderId: string },
  ) {
    this.validateUserId(userId);
    const result = await this.balanceService.releaseFunds(
      userId,
      body.amount,
      body.orderId,
    );
    return { success: true, data: result };
  }

  @Post('settle-buy')
  @ApiOperation({ summary: '매수 정산', description: '매수 거래를 정산하고 보유 자산에 추가합니다' })
  async settleBuy(
    @Headers('x-user-id') userId: string,
    @Body() body: { symbol: string; quantity: string; price: string; tradeId: string },
  ) {
    this.validateUserId(userId);
    const result = await this.balanceService.settleBuy(
      userId,
      body.symbol,
      body.quantity,
      body.price,
      body.tradeId,
    );
    return { success: true, data: result };
  }

  @Post('settle-sell')
  @ApiOperation({ summary: '매도 정산', description: '매도 거래를 정산하고 보유 자산에서 차감합니다' })
  async settleSell(
    @Headers('x-user-id') userId: string,
    @Body() body: { symbol: string; quantity: string; price: string; tradeId: string },
  ) {
    this.validateUserId(userId);
    const result = await this.balanceService.settleSell(
      userId,
      body.symbol,
      body.quantity,
      body.price,
      body.tradeId,
    );
    return { success: true, data: result };
  }

  @Get('holding')
  @ApiOperation({ summary: '보유 자산 조회', description: '특정 심볼의 보유 자산 정보를 조회합니다' })
  async getHolding(
    @Headers('x-user-id') userId: string,
    @Query('symbol') symbol: string,
  ) {
    this.validateUserId(userId);
    if (!symbol) {
      throw new BadRequestException('symbol query parameter is required');
    }
    if (!SYMBOL_REGEX.test(symbol)) {
      throw new BadRequestException('Invalid symbol format');
    }
    const holding = await this.balanceService.getHoldingBySymbol(userId, symbol);
    return { success: true, data: holding };
  }

  private validateUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }
  }
}
