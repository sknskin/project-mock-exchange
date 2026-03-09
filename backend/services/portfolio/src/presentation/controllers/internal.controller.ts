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
import Decimal from 'decimal.js';
import { BalanceService } from '../../domain/services/balance.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import { ReserveFundsDto, ReleaseFundsDto, SettleTradeDto, ReserveHoldingsDto, ReleaseHoldingsDto } from '../dto/internal.dto';

// 한국 주식(005930.KS) + 미국 주식/암호화폐(AAPL-USD, BTC-USD) 모두 지원
const SYMBOL_REGEX = /^[A-Z0-9]{2,10}([.-][A-Z]{1,4})?(-USD)?$/;

/** @tag Portfolio Internal */
@UseGuards(InternalAuthGuard)
@Controller('portfolio/internal')
export class InternalController {
  constructor(private readonly balanceService: BalanceService) {}

  /** 자금 예약 — 주문 실행을 위해 사용자의 현금을 예약합니다 */
  @Post('reserve')
  async reserveFunds(
    @Headers('x-user-id') userId: string,
    @Body() body: ReserveFundsDto,
  ) {
    this.validateUserId(userId);
    const result = await this.balanceService.reserveFunds(
      userId,
      body.amount,
      body.orderId || 'pending',
    );
    return { success: true, data: result };
  }

  /** 자금 해제 — 예약된 현금을 해제하여 사용 가능한 잔고로 복원합니다 */
  @Post('release')
  async releaseFunds(
    @Headers('x-user-id') userId: string,
    @Body() body: ReleaseFundsDto,
  ) {
    this.validateUserId(userId);
    const result = await this.balanceService.releaseFunds(
      userId,
      body.amount,
      body.orderId,
    );
    return { success: true, data: result };
  }

  /** 매수 정산 — 매수 거래를 정산하고 보유 자산에 추가합니다 */
  @Post('settle-buy')
  async settleBuy(
    @Headers('x-user-id') userId: string,
    @Body() body: SettleTradeDto,
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

  /** 매도 정산 — 매도 거래를 정산하고 보유 자산에서 차감합니다 */
  @Post('settle-sell')
  async settleSell(
    @Headers('x-user-id') userId: string,
    @Body() body: SettleTradeDto,
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

  /** 보유 자산 예약 — 매도 주문을 위해 사용자의 보유 자산을 검증하고 예약합니다
   * Reserve holdings — validate and reserve user's holdings for a sell order */
  @Post('reserve-holdings')
  async reserveHoldings(
    @Headers('x-user-id') userId: string,
    @Body() body: ReserveHoldingsDto,
  ) {
    this.validateUserId(userId);

    if (!body.symbol || !SYMBOL_REGEX.test(body.symbol)) {
      throw new BadRequestException('Invalid or missing symbol');
    }

    const qty = new Decimal(body.quantity);
    if (qty.lte(0)) {
      throw new BadRequestException('Quantity must be positive');
    }

    const result = await this.balanceService.reserveHoldings(userId, body.symbol, qty.toFixed(8));

    return {
      success: true,
      data: {
        symbol: body.symbol,
        requestedQuantity: qty.toFixed(8),
        reservedQuantity: result.reserved,
        availableQuantity: result.available,
      },
    };
  }

  /** 보유 자산 예약 해제 — 매도 주문 취소 시 예약된 보유 자산을 해제합니다
   * Release holdings — release reserved holdings when a sell order is cancelled */
  @Post('release-holdings')
  async releaseHoldings(
    @Headers('x-user-id') userId: string,
    @Body() body: ReleaseHoldingsDto,
  ) {
    this.validateUserId(userId);

    if (!body.symbol || !SYMBOL_REGEX.test(body.symbol)) {
      throw new BadRequestException('Invalid or missing symbol');
    }

    const qty = new Decimal(body.quantity);
    if (qty.lte(0)) {
      throw new BadRequestException('Quantity must be positive');
    }

    const result = await this.balanceService.releaseHoldings(userId, body.symbol, qty.toFixed(8));

    return {
      success: true,
      data: {
        symbol: body.symbol,
        releasedQuantity: result.released,
        remainingReserved: result.reserved,
      },
    };
  }

  /** 보유 자산 조회 — 특정 심볼의 보유 자산 정보를 조회합니다 */
  @Get('holding')
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
