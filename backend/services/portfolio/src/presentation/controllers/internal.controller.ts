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
  Logger,
  UseGuards,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { BalanceService } from '../../domain/services/balance.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

const SYMBOL_REGEX = /^[A-Z]{2,10}(-USD)?$/;

/** @tag Portfolio Internal */
@UseGuards(InternalAuthGuard)
@Controller('portfolio/internal')
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  constructor(private readonly balanceService: BalanceService) {}

  @Post('reserve')
  /** 자금 예약 — 주문 실행을 위해 사용자의 현금을 예약합니다 */
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
  /** 자금 해제 — 예약된 현금을 해제하여 사용 가능한 잔고로 복원합니다 */
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
  /** 매수 정산 — 매수 거래를 정산하고 보유 자산에 추가합니다 */
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
  /** 매도 정산 — 매도 거래를 정산하고 보유 자산에서 차감합니다 */
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

  @Post('reserve-holdings')
  /** 보유 자산 예약 — 매도 주문을 위해 사용자의 보유 자산을 검증하고 예약합니다 */
  /** Reserve holdings — validate and reserve user's holdings for a sell order */
  async reserveHoldings(
    @Headers('x-user-id') userId: string,
    @Body() body: { symbol: string; quantity: string },
  ) {
    this.validateUserId(userId);

    if (!body.symbol || !SYMBOL_REGEX.test(body.symbol)) {
      throw new BadRequestException('Invalid or missing symbol');
    }

    const qty = new Decimal(body.quantity);
    if (qty.lte(0)) {
      throw new BadRequestException('Quantity must be positive');
    }

    const holding = await this.balanceService.getHoldingBySymbol(userId, body.symbol);

    if (!holding) {
      throw new BadRequestException(
        `No holding found for symbol ${body.symbol}`,
      );
    }

    const availableQty = new Decimal(holding.quantity);
    if (availableQty.lt(qty)) {
      throw new BadRequestException(
        `Insufficient holdings: available ${availableQty.toFixed(8)} ${body.symbol}, requested ${qty.toFixed(8)}`,
      );
    }

    // TODO: Implement full holding reservation with a reservedQuantity column
    // For now, we validate the holdings exist and the quantity is sufficient.
    this.logger.warn(
      `reserve-holdings: full holding reservation is a TODO — ` +
        `validated ${qty.toFixed(8)} ${body.symbol} for user ${userId.substring(0, 8)}...`,
    );

    return {
      success: true,
      data: {
        symbol: body.symbol,
        requestedQuantity: qty.toFixed(8),
        availableQuantity: availableQty.toFixed(8),
      },
    };
  }

  @Get('holding')
  /** 보유 자산 조회 — 특정 심볼의 보유 자산 정보를 조회합니다 */
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
