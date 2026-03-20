/**
 * @file 주문 컨트롤러
 * @description 주문 생성, 수정, 취소, 조회 API 엔드포인트를 처리합니다
 *
 * @file Order Controller
 * @description Handles order CRUD API endpoints: create, modify, cancel, query
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Query,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from '../../application/services/order.service';
import { PlaceOrderRequestDto } from '../dto/place-order.dto';
import { ModifyOrderRequestDto } from '../dto/modify-order.dto';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
  ) {}

  /** 주문 생성 — userId는 API Gateway에서 JWT로 추출하여 전달
   * Place order — userId forwarded from API Gateway via JWT */
  @Post()
  async placeOrder(
    @Headers('x-user-id') userId: string,
    @Body() dto: PlaceOrderRequestDto,
  ) {
    this.validateUserId(userId);

    // 지정가 주문은 반드시 가격 필요 / Limit orders must specify a price
    if (dto.type === 'LIMIT' && !dto.price) {
      throw new BadRequestException('Limit orders require a price');
    }

    // 조건부 주문 유효성 검사 / Validate conditional order fields
    if (dto.triggerType && !dto.triggerPrice) {
      throw new BadRequestException('Trigger price is required for stop-loss/take-profit orders');
    }
    if (dto.triggerPrice && !dto.triggerType) {
      throw new BadRequestException('Trigger type is required when trigger price is set');
    }

    const result = await this.orderService.placeOrder({
      userId,
      symbol: dto.symbol,
      side: dto.side,
      type: dto.type,
      price: dto.price,
      quantity: dto.quantity,
      idempotencyKey: dto.idempotencyKey,
      triggerPrice: dto.triggerPrice,
      triggerType: dto.triggerType,
    });

    return { success: true, data: result };
  }

  /** 조건부 주문 트리거 확인 — Market Data 서비스에서 주기적 호출
   * Check conditional order triggers — called periodically by Market Data service */
  @Post('check-triggers')
  async checkTriggers(
    @Body() body: { symbol: string; currentPrice: string },
  ) {
    if (!body.symbol || !body.currentPrice) {
      throw new BadRequestException('symbol and currentPrice are required');
    }
    const result = await this.orderService.checkTriggers(body.symbol, body.currentPrice);
    return { success: true, data: result };
  }

  /** 주문 가격/수량 수정
   * Modify order price and/or quantity */
  @Patch(':orderId')
  async modifyOrder(
    @Headers('x-user-id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: ModifyOrderRequestDto,
  ) {
    this.validateUserId(userId);
    const result = await this.orderService.modifyOrder(
      orderId,
      userId,
      dto.price,
      dto.quantity,
    );
    return { success: true, data: result };
  }

  /** 주문 취소
   * Cancel an order */
  @Delete(':orderId')
  async cancelOrder(
    @Headers('x-user-id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    this.validateUserId(userId);
    await this.orderService.cancelOrder(orderId, userId);
    return { success: true, data: { message: `Order ${orderId} cancelled` } };
  }

  /** 특정 주문 상세 조회
   * Get details of a specific order */
  @Get(':orderId')
  async getOrder(
    @Headers('x-user-id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    this.validateUserId(userId);
    const order = await this.orderService.getOrder(orderId, userId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return { success: true, data: order };
  }

  /** 사용자의 주문 목록을 페이징 조회
   * Get paginated list of user's orders */
  @Get()
  async getUserOrders(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('symbol') symbol?: string,
  ) {
    this.validateUserId(userId);
    // 페이지네이션 최대값 제한 (1~500) — 메모리 소진 방지 / Cap pagination limit (1-500) — prevents memory exhaustion
    const parsedLimit = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(offset || '0', 10) || 0, 0);
    const orders = await this.orderService.getUserOrders(
      userId,
      parsedLimit,
      parsedOffset,
      status,
      symbol,
    );
    return { success: true, data: orders };
  }

  /** 사용자의 체결 내역을 페이징 조회
   * Get paginated trade history for a user */
  @Get('trades/history')
  async getUserTrades(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('symbol') symbol?: string,
    @Query('side') side?: string,
  ) {
    this.validateUserId(userId);
    const trades = await this.orderService.getUserTrades(
      userId,
      Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 500),
      Math.max(parseInt(offset || '0', 10) || 0, 0),
      symbol,
      side as 'BUY' | 'SELL' | undefined,
    );
    return { success: true, data: trades };
  }

  /** 관리자용 전체 체결 내역 페이징 조회
   * Get all trades for admin audit (paginated) */
  @Get('trades/admin-audit')
  async adminAuditTrades(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('symbol') symbol?: string,
    @Query('side') side?: string,
    @Query('search') search?: string,
  ) {
    const safePage = Math.max(parseInt(page || '1', 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit || '30', 10) || 30, 1), 100);
    const result = await this.orderService.getAdminAuditTrades(safePage, safeLimit, {
      symbol: symbol || undefined,
      side: side || undefined,
      search: search || undefined,
    });
    return { success: true, data: result };
  }

  /** 거래 통계 조회 (기간별 주문 수, 거래량 등)
   * Get trading statistics (order count, volume, etc.) */
  @Get('stats/trading')
  async tradingStats(@Query('days') days?: string) {
    const daysNum = Math.min(parseInt(days || '30', 10) || 30, 365);
    const stats = await this.orderService.getTradingStats(daysNum);
    return { success: true, data: stats };
  }

  /** 특정 심볼의 오더북(호가창) 조회
   * Get order book depth for a symbol */
  @Get('book/:symbol')
  async getOrderBook(@Param('symbol') symbol: string) {
    const book = this.orderService.getOrderBook(symbol);
    return { success: true, data: book };
  }

  // UUID v4 형식 검증 — 잘못된 userId로 인한 쿼리 오류 방지
  // UUID v4 format validation — prevents query errors from invalid userId
  private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private validateUserId(userId: string): void {
    if (!userId || !this.UUID_REGEX.test(userId)) {
      throw new BadRequestException('Valid x-user-id header is required');
    }
  }
}
