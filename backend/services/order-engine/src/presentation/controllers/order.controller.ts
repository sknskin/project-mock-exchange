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

  @Post()
  async placeOrder(
    @Headers('x-user-id') userId: string,
    @Body() dto: PlaceOrderRequestDto,
  ) {
    this.validateUserId(userId);

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

  @Delete(':orderId')
  async cancelOrder(
    @Headers('x-user-id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    this.validateUserId(userId);
    await this.orderService.cancelOrder(orderId, userId);
    return { success: true, data: { message: `Order ${orderId} cancelled` } };
  }

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

  @Get()
  async getUserOrders(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ) {
    this.validateUserId(userId);
    const parsedLimit = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(offset || '0', 10) || 0, 0);
    const orders = await this.orderService.getUserOrders(
      userId,
      parsedLimit,
      parsedOffset,
      status,
    );
    return { success: true, data: orders };
  }

  @Get('trades/history')
  async getUserTrades(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.validateUserId(userId);
    const trades = await this.orderService.getUserTrades(
      userId,
      Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 500),
      Math.max(parseInt(offset || '0', 10) || 0, 0),
    );
    return { success: true, data: trades };
  }

  @Get('stats/trading')
  async tradingStats(@Query('days') days?: string) {
    const daysNum = Math.min(parseInt(days || '30', 10) || 30, 365);
    const stats = await this.orderService.getTradingStats(daysNum);
    return { success: true, data: stats };
  }

  @Get('book/:symbol')
  async getOrderBook(@Param('symbol') symbol: string) {
    const book = this.orderService.getOrderBook(symbol);
    return { success: true, data: book };
  }

  private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private validateUserId(userId: string): void {
    if (!userId || !this.UUID_REGEX.test(userId)) {
      throw new BadRequestException('Valid x-user-id header is required');
    }
  }
}
