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
} from '@nestjs/common';
import { OrderService } from '../../application/services/order.service';
import { PlaceOrderRequestDto } from '../dto/place-order.dto';
import { ModifyOrderRequestDto } from '../dto/modify-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async placeOrder(
    @Headers('x-user-id') userId: string,
    @Body() dto: PlaceOrderRequestDto,
  ) {
    this.validateUserId(userId);

    if (dto.type === 'LIMIT' && !dto.price) {
      throw new BadRequestException('Limit orders require a price');
    }

    const result = await this.orderService.placeOrder({
      userId,
      symbol: dto.symbol,
      side: dto.side,
      type: dto.type,
      price: dto.price,
      quantity: dto.quantity,
      idempotencyKey: dto.idempotencyKey,
    });

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
    return { success: true, message: `Order ${orderId} cancelled` };
  }

  @Get(':orderId')
  async getOrder(
    @Headers('x-user-id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    this.validateUserId(userId);
    const order = await this.orderService.getOrder(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }
    return { success: true, data: order };
  }

  @Get()
  async getUserOrders(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.validateUserId(userId);
    const orders = await this.orderService.getUserOrders(
      userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
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
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
    return { success: true, data: trades };
  }

  @Get('book/:symbol')
  async getOrderBook(@Param('symbol') symbol: string) {
    const book = this.orderService.getOrderBook(symbol);
    return { success: true, data: book };
  }

  private validateUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }
  }
}
