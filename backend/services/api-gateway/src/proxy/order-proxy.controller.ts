/**
 * @file 주문 프록시 컨트롤러
 * @description API Gateway에서 Order Engine으로 주문 요청을 프록시합니다
 *
 * @file Order Proxy Controller
 * @description Proxies order requests from API Gateway to Order Engine service
 */
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
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

@ApiTags('Orders')
@Controller('api/orders')
export class OrderProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /** 주문 생성 요청을 order-engine으로 프록시
   * Proxy order placement to order-engine service */
  // 주문 생성 — 분당 60건 제한으로 악의적 대량 주문 방지 / Place order — 60/min limit prevents malicious order flooding
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: '주문 생성', description: '시장가/지정가/손절/익절 주문을 생성합니다' })
  @ApiResponse({ status: 201, description: '주문 접수 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async placeOrder(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'POST',
      url: '/orders',
      data: body,
      headers: { 'x-user-id': userId },
    });

    // WebSocket으로 거래 체결 알림 전송 (Send trade execution notification via WebSocket)
    if (result.status < 400 && userId) {
      this.sendTradeNotification(userId, result.data, req).catch((e) => new Logger('OrderProxy').warn('sendTradeNotification failed', e.message));
    }

    return res.status(result.status).json(result.data);
  }

  /**
   * 거래 체결 시 WebSocket 실시간 알림 + DB 영구 저장 (최선 노력 방식)
   * 실패해도 주문 응답에는 영향 없음
   *
   * Send real-time WebSocket notification + persist to DB on trade execution (best-effort).
   * Failures do not affect the order response.
   */
  private async sendTradeNotification(userId: string, responseData: unknown, req: Request) {
    try {
      const data = responseData as {
        data?: {
          orderId?: string;
          status?: string;
          fills?: { symbol?: string; matchedQuantity?: string; matchedPrice?: string; buyerId?: string }[];
        };
      };
      const order = data?.data;
      if (!order) return;

      const fills = order.fills;
      const hasFills = fills && Array.isArray(fills) && fills.length > 0;
      const isFilled = order.status === 'FILLED' || order.status === 'PARTIALLY_FILLED';

      if (hasFills || isFilled) {
        const firstFill = fills?.[0];
        const symbol = firstFill?.symbol ?? '???';
        const isBuy = firstFill?.buyerId === userId;
        const side = isBuy ? 'BUY' : 'SELL';
        const totalQty = fills?.reduce((s, f) => s + Number(f.matchedQuantity || 0), 0) ?? 0;
        const avgPrice = fills && fills.length > 0
          ? fills.reduce((s, f) => s + Number(f.matchedPrice || 0), 0) / fills.length
          : 0;
        const filledStatus = order.status === 'FILLED' ? 'FILLED' : 'PARTIALLY_FILLED';

        // 구조화된 데이터 전송 — 프론트엔드에서 로케일에 맞게 포맷
        // Send structured data — frontend formats according to locale
        this.chatGateway.notifyUser(userId, 'notification:trade', {
          type: 'TRADE_EXECUTION',
          side,
          symbol,
          quantity: totalQty,
          price: avgPrice,
          filledStatus,
          timestamp: new Date().toISOString(),
        });

        // 알림을 DB에 영구 저장 (Persist notification to DB)
        const sideLabel = isBuy ? 'Buy' : 'Sell';
        const title = `${sideLabel} ${symbol}`;
        const message = `${totalQty} @ ${avgPrice.toFixed(2)} - ${filledStatus === 'FILLED' ? 'Filled' : 'Partially Filled'}`;
        await this.proxyService.forward('user-auth', {
          method: 'POST',
          url: '/notifications',
          data: {
            userId,
            type: 'GENERAL',
            title,
            message,
            link: `/orders`,
          },
          headers: { Authorization: req.headers.authorization || '' },
        }).catch((e) => new Logger('OrderProxy').warn('Notification persist failed', e.message));
      }
    } catch {
      // 최선의 노력 알림 (Best-effort notification)
    }
  }

  // ── 구체적 경로를 :orderId 파라미터 경로보다 먼저 정의 ──
  // ── Specific paths must come before :orderId parameter path ──

  /** 거래 통계 조회를 order-engine으로 프록시
   * Proxy trading statistics to order-engine service */
  @Get('stats/trading')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래 통계', description: '거래량, 인기 자산, 매수/매도 비율 등 거래 통계' })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간 (일)' })
  @ApiResponse({ status: 200, description: '거래 통계 반환' })
  async tradingStats(
    @Query('days') days: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders/stats/trading',
      params: { days },
    });
    return res.status(result.status).json(result.data);
  }

  /** 호가창 조회를 order-engine으로 프록시
   * Proxy order book to order-engine service */
  @Get('book/:symbol')
  @ApiOperation({ summary: '호가창 조회', description: '특정 자산의 호가창(주문서)을 반환합니다' })
  @ApiParam({ name: 'symbol', description: '자산 심볼 (예: BTC-USD)' })
  @ApiResponse({ status: 200, description: '호가창 데이터 반환' })
  async getOrderBook(@Param('symbol') symbol: string, @Res() res: Response) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: `/orders/book/${symbol}`,
    });
    return res.status(result.status).json(result.data);
  }

  /** 사용자 체결 내역 조회를 order-engine으로 프록시
   * Proxy user trade history to order-engine service */
  @Get('trades/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '체결 내역 조회', description: '현재 사용자의 체결 내역을 반환합니다' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiQuery({ name: 'offset', required: false, description: '오프셋' })
  @ApiResponse({ status: 200, description: '체결 내역 반환' })
  async getUserTrades(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders/trades/history',
      params: { limit, offset },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 사용자 주문 목록 조회를 order-engine으로 프록시
   * Proxy user order list to order-engine service */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 주문 목록 조회', description: '현재 사용자의 주문 목록을 반환합니다' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiQuery({ name: 'offset', required: false, description: '오프셋' })
  @ApiQuery({ name: 'status', required: false, description: '주문 상태 필터 (예: PENDING, FILLED, CANCELLED)' })
  @ApiResponse({ status: 200, description: '주문 목록 반환' })
  async getUserOrders(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Query('status') status: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders',
      params: { limit, offset, status },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 주문 상세 조회를 order-engine으로 프록시
   * Proxy order detail to order-engine service */
  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '주문 상세 조회', description: '특정 주문의 상세 정보를 반환합니다' })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({ status: 200, description: '주문 상세 반환' })
  @ApiResponse({ status: 404, description: '주문 없음' })
  async getOrder(@Param('orderId') orderId: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: `/orders/${orderId}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 주문 수정을 order-engine으로 프록시
   * Proxy order modification to order-engine service */
  @Patch(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '주문 수정', description: '미체결 주문의 가격 또는 수량을 수정합니다' })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({ status: 200, description: '주문 수정 성공' })
  @ApiResponse({ status: 404, description: '주문 없음' })
  async modifyOrder(
    @Param('orderId') orderId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'PATCH',
      url: `/orders/${orderId}`,
      data: body,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 주문 취소를 order-engine으로 프록시
   * Proxy order cancellation to order-engine service */
  @Delete(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '주문 취소', description: '미체결 주문을 취소합니다' })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({ status: 200, description: '주문 취소 성공' })
  @ApiResponse({ status: 404, description: '주문 없음' })
  async cancelOrder(@Param('orderId') orderId: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req as Record<string, any>).user?.id;
    const result = await this.proxyService.forward('order-engine', {
      method: 'DELETE',
      url: `/orders/${orderId}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }
}
