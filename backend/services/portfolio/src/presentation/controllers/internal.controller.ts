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
import { BalanceService } from '../../domain/services/balance.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('portfolio/internal')
export class InternalController {
  constructor(private readonly balanceService: BalanceService) {}

  @Post('reserve')
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
  async getHolding(
    @Headers('x-user-id') userId: string,
    @Query('symbol') symbol: string,
  ) {
    this.validateUserId(userId);
    if (!symbol) {
      throw new BadRequestException('symbol query parameter is required');
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
