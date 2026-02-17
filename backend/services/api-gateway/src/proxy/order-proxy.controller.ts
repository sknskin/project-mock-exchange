import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/orders')
@UseGuards(JwtAuthGuard)
export class OrderProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post()
  async placeOrder(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'POST',
      url: '/orders',
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Patch(':orderId')
  async modifyOrder(
    @Param('orderId') orderId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'PATCH',
      url: `/orders/${orderId}`,
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Delete(':orderId')
  async cancelOrder(@Param('orderId') orderId: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'DELETE',
      url: `/orders/${orderId}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: `/orders/${orderId}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get()
  async getUserOrders(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders',
      params: { limit, offset },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('trades/history')
  async getUserTrades(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders/trades/history',
      params: { limit, offset },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('book/:symbol')
  async getOrderBook(@Param('symbol') symbol: string, @Res() res: Response) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: `/orders/book/${symbol}`,
    });
    return res.status(result.status).json(result.data);
  }
}
