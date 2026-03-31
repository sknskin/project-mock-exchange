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
import { AdminRolesGuard } from '../auth/admin-roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatGateway } from '../gateway/chat.gateway';
import { PlaceOrderDto } from './dto/place-order.dto';
import { ModifyOrderDto } from './dto/modify-order.dto';

/** DB-M-01: 사용자 정보 인메모리 캐시 — 반복적인 user-auth 서비스 호출 방지
 * DB-M-01: In-memory user info cache — prevents repeated user-auth service calls */
interface CachedUserMap {
  data: Map<string, string>;
  expiry: number;
}

/** DB-M-01: 캐시 유효 시간 (60초) / Cache TTL (60 seconds) */
const USER_CACHE_TTL_MS = 60_000;

@ApiTags('Orders')
@Controller('api/orders')
export class OrderProxyController {
  /** DB-M-01: 사용자 이름 캐시 — admin audit trades에서 N+1 조회 방지
   * DB-M-01: User name cache — prevents N+1 lookups in admin audit trades */
  private userInfoCache: CachedUserMap | null = null;

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
  async placeOrder(@Body() body: PlaceOrderDto, @CurrentUser('id') userId: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'POST',
      url: '/orders',
      data: body,
      headers: { 'x-user-id': userId },
    });

    // WebSocket으로 거래 체결 알림 전송 (Send trade execution notification via WebSocket)
    if (result.status < 400 && userId) {
      this.sendTradeNotification(userId, result.data, req).catch((e) => new Logger('OrderProxy').warn('sendTradeNotification failed', e instanceof Error ? e.name : 'UnknownError'));
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
        const message = `${sideLabel} order for ${symbol} has been ${filledStatus === 'FILLED' ? 'filled' : 'partially filled'}`;
        await this.proxyService.forward('user-auth', {
          method: 'POST',
          url: '/notifications',
          data: {
            userId,
            type: 'TRADE',
            title,
            message,
            link: `/orders`,
          },
          headers: { Authorization: req.headers.authorization || '' },
        }).catch((e) => new Logger('OrderProxy').warn('Notification persist failed', e.message));
      }
    } catch (error) {
      // ERR-L-02: 최선의 노력 알림 — 실패 시에도 에러 로깅 (Best-effort notification — log errors on failure)
      new Logger('OrderProxy').warn(
        `sendTradeNotification error: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  // ── 구체적 경로를 :orderId 파라미터 경로보다 먼저 정의 ──
  // ── Specific paths must come before :orderId parameter path ──

  /** 관리자용 주문 감사 로그를 order-engine으로 프록시
   * Proxy admin audit trades to order-engine service */
  @Get('trades/admin-audit')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '주문 감사 로그', description: '전체 사용자의 체결 내역을 시간순으로 조회합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '조회 개수' })
  @ApiResponse({ status: 200, description: '주문 감사 로그 반환' })
  async adminAuditTrades(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('symbol') symbol: string,
    @Query('side') side: string,
    @Query('search') search: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders/trades/admin-audit',
      params: { page, limit, symbol: symbol || undefined, side: side || undefined, search: search || undefined },
    });

    // ERR-M-02: any 타입을 구체적 인터페이스로 대체 / Replace any with typed interfaces
    // DB-M-01: 인메모리 캐시를 활용한 사용자 이름 enrichment — N+1 호출 방지
    // DB-M-01: User name enrichment with in-memory cache — prevents N+1 calls
    interface AuditTrade { userId?: string; username?: string; [key: string]: unknown }
    interface UserInfo { id: string; username?: string; name?: string }
    try {
      const data = result.data as Record<string, unknown>;
      const inner = data?.data as Record<string, unknown> | undefined;
      const trades = (inner?.trades ?? []) as AuditTrade[];
      if (Array.isArray(trades) && trades.length > 0) {
        const userIds = [...new Set(trades.map((t: AuditTrade) => t.userId).filter(Boolean))] as string[];
        if (userIds.length > 0) {
          // DB-M-01: 캐시가 유효하면 재사용, 만료되었거나 누락된 ID가 있으면 새로 조회
          // DB-M-01: Reuse cache if valid; fetch fresh if expired or missing IDs
          const now = Date.now();
          let userMap: Map<string, string>;

          if (this.userInfoCache && this.userInfoCache.expiry > now) {
            // 캐시 유효 — 누락된 ID만 확인 / Cache valid — check for missing IDs
            const missingIds = userIds.filter((id) => !this.userInfoCache!.data.has(id));
            if (missingIds.length === 0) {
              userMap = this.userInfoCache.data;
            } else {
              // 누락된 ID만 추가 조회 / Fetch only missing IDs
              const usersResult = await this.proxyService.forward('user-auth', {
                method: 'POST',
                url: '/users/by-ids',
                data: { ids: missingIds },
              });
              const usersData = (usersResult.data as Record<string, unknown>)?.data ?? [];
              const users = usersData as UserInfo[];
              if (Array.isArray(users)) {
                users.forEach((u: UserInfo) => {
                  this.userInfoCache!.data.set(u.id, u.username ?? u.name ?? '-');
                });
              }
              userMap = this.userInfoCache.data;
            }
          } else {
            // 캐시 없거나 만료 — 전체 조회 후 새 캐시 생성
            // No cache or expired — fetch all and create new cache
            const usersResult = await this.proxyService.forward('user-auth', {
              method: 'POST',
              url: '/users/by-ids',
              data: { ids: userIds },
            });
            const usersData = (usersResult.data as Record<string, unknown>)?.data ?? [];
            const users = usersData as UserInfo[];
            userMap = new Map(Array.isArray(users) ? users.map((u: UserInfo) => [u.id, u.username ?? u.name ?? '-']) : []);
            this.userInfoCache = { data: userMap, expiry: now + USER_CACHE_TTL_MS };
          }

          trades.forEach((t: AuditTrade) => { t.username = userMap.get(t.userId ?? '') ?? t.userId?.slice(0, 8); });
        }
      }
    } catch (error) {
      // ERR-L-02: enrichment 실패 시 userId만 표시하되 에러 로깅 / Show only userId on enrichment failure, but log error
      new Logger('OrderProxy').warn(
        `adminAuditTrades enrichment failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return res.status(result.status).json(result.data);
  }

  /** 거래 통계 조회를 order-engine으로 프록시
   * Proxy trading statistics to order-engine service */
  @Get('stats/trading')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래 통계', description: '거래량, 인기 자산, 매수/매도 비율 등 거래 통계' })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간 (일)' })
  @ApiResponse({ status: 200, description: '거래 통계 반환' })
  async tradingStats(
    @Query('days') days: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders/stats/trading',
      params: { days },
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }

  /** 호가창 조회를 order-engine으로 프록시
   * Proxy order book to order-engine service */
  // AUTH-M-01: 호가창 조회에 인증 필수 적용 — 비인증 사용자 접근 차단
  // AUTH-M-01: Require authentication for order book endpoint — block unauthenticated access
  @Get('book/:symbol')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '호가창 조회', description: '특정 자산의 호가창(주문서)을 반환합니다' })
  @ApiParam({ name: 'symbol', description: '자산 심볼 (예: BTC-USD)' })
  @ApiResponse({ status: 200, description: '호가창 데이터 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
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
  @ApiQuery({ name: 'symbol', required: false, description: '종목 심볼 필터 (예: BTC-USD)' })
  @ApiQuery({ name: 'side', required: false, description: '매수/매도 필터 (BUY 또는 SELL)' })
  @ApiResponse({ status: 200, description: '체결 내역 반환' })
  async getUserTrades(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Query('symbol') symbol: string,
    @Query('side') side: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders/trades/history',
      params: { limit, offset, symbol: symbol || undefined, side: side || undefined },
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
  @ApiQuery({ name: 'symbol', required: false, description: '종목 심볼 필터 (예: BTC-USD)' })
  @ApiResponse({ status: 200, description: '주문 목록 반환' })
  async getUserOrders(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Query('status') status: string,
    @Query('symbol') symbol: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'GET',
      url: '/orders',
      params: { limit, offset, status, symbol: symbol || undefined },
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
  async getOrder(@Param('orderId') orderId: string, @CurrentUser('id') userId: string, @Res() res: Response) {
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
    @Body() body: ModifyOrderDto,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
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
  async cancelOrder(@Param('orderId') orderId: string, @CurrentUser('id') userId: string, @Res() res: Response) {
    const result = await this.proxyService.forward('order-engine', {
      method: 'DELETE',
      url: `/orders/${orderId}`,
      headers: { 'x-user-id': userId },
    });
    return res.status(result.status).json(result.data);
  }
}
