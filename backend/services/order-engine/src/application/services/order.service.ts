/**
 * @file 주문 애플리케이션 서비스
 * @description 주문 생성, 수정, 취소 및 조회 유스케이스를 처리합니다
 *
 * @file Order Application Service
 * @description Handles order placement, modification, cancellation, and query use cases
 */
import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventStoreService } from '@virtuex/event-store';
import {
  KAFKA_TOPICS,
  generateOrderId,
  generateEventId,
  generateCorrelationId,
} from '@virtuex/common';
import Decimal from 'decimal.js';
import axios from 'axios';
import { OrderAggregate } from '../../domain/aggregates/order.aggregate';
import { MatchingEngineService, MatchResult } from '../../domain/services/matching-engine.service';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma';

export interface PlaceOrderParams {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  price?: string;
  quantity: string;
  idempotencyKey: string;
  triggerPrice?: string;
  triggerType?: string;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly marketDataUrl: string;
  private readonly portfolioUrl: string;
  private readonly internalToken: string;
  private readonly httpTimeout: number;

  /** 환율 캐시 (USD → KRW) / Exchange rate cache */
  private cachedExchangeRate: { rate: Decimal; fetchedAt: number } | null = null;
  private static readonly EXCHANGE_RATE_TTL_MS = 10 * 60 * 1000; // 10분

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly matchingEngine: MatchingEngineService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.marketDataUrl = this.config.getOrThrow<string>('MARKET_DATA_URL');
    this.portfolioUrl = this.config.getOrThrow<string>('PORTFOLIO_URL');
    this.internalToken = this.config.getOrThrow<string>('INTERNAL_SERVICE_SECRET');
    this.httpTimeout = this.config.get<number>('INTERNAL_HTTP_TIMEOUT', 5000);
  }

  /**
   * 심볼이 USD 기반인지 판별 / Check if symbol is USD-denominated
   * .KS 접미사 = KRW, 그 외 = USD
   */
  private isUsdSymbol(symbol: string): boolean {
    return !symbol.endsWith('.KS');
  }

  /**
   * USD → KRW 환율을 가져옵니다 (10분 캐시).
   * Fetch USD→KRW exchange rate (cached 10min).
   */
  private async getExchangeRate(): Promise<Decimal> {
    const now = Date.now();
    if (
      this.cachedExchangeRate &&
      now - this.cachedExchangeRate.fetchedAt < OrderService.EXCHANGE_RATE_TTL_MS
    ) {
      return this.cachedExchangeRate.rate;
    }
    try {
      const { data } = await axios.get<{ rates: { KRW: number } }>(
        'https://api.frankfurter.app/latest?from=USD&to=KRW',
        { timeout: 5000 },
      );
      const rate = new Decimal(data.rates.KRW);
      this.cachedExchangeRate = { rate, fetchedAt: now };
      this.logger.log(`Fetched USD→KRW exchange rate: ${rate}`);
      return rate;
    } catch (e) {
      // 캐시 만료되었더라도 이전 값 사용 / Use stale cache as fallback
      if (this.cachedExchangeRate) {
        this.logger.warn('Exchange rate fetch failed, using stale cache');
        return this.cachedExchangeRate.rate;
      }
      // 최초 실패 시 기본값 / Default fallback
      this.logger.warn('Exchange rate fetch failed, using default 1450');
      return new Decimal(1450);
    }
  }

  /**
   * USD 가격을 KRW로 변환 (KRW 심볼이면 변환하지 않음)
   * Convert USD price to KRW (no-op for KRW symbols)
   */
  private async toKrw(price: Decimal, symbol: string): Promise<Decimal> {
    if (!this.isUsdSymbol(symbol)) return price;
    const rate = await this.getExchangeRate();
    return price.mul(rate);
  }

  async placeOrder(params: PlaceOrderParams): Promise<{
    orderId: string;
    status: string;
    fills: MatchResult[];
  }> {
    // 0. 매칭 엔진 초기화 확인 — 초기화 전 주문 방지 / Check matching engine readiness
    if (!this.matchingEngine.isReady()) {
      throw new BadRequestException('Order engine is initializing. Please try again in a moment.');
    }

    // 1. 멱등성 사전 검사 (빠른 경로) / Idempotency pre-check (fast path)
    // 주의: 이 검사만으로는 TOCTOU 경쟁 조건이 있으므로, 아래 projectOrderPlaced에서
    // 유니크 제약 조건 위반(P2002) catch로 원자적 멱등성을 보장합니다.
    // Note: This pre-check alone has a TOCTOU race condition; atomic idempotency is
    // guaranteed by catching unique constraint violations (P2002) in projectOrderPlaced below.
    const existing = await this.prisma.orderRead.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return { orderId: existing.orderId, status: existing.status, fills: [] };
    }

    // 2. 심볼 유효성 검증 및 현재가 조회 / Validate symbol and get current price
    const marketPrice = await this.getMarketPrice(params.symbol);
    if (!marketPrice) {
      throw new BadRequestException(`Symbol ${params.symbol} not found or price unavailable`);
    }

    // 3. 체결 가격 결정 / Determine execution price
    const executionPrice =
      params.type === 'MARKET'
        ? marketPrice
        : new Decimal(params.price!);

    const quantity = new Decimal(params.quantity);
    const totalCost = executionPrice.mul(quantity);

    // 4. 매수 주문 시 자금 예약 (KRW 변환), 매도 주문 시 보유량 검증
    // For BUY orders reserve funds (converted to KRW), for SELL orders validate holdings
    if (params.side === 'BUY') {
      const reserveKrw = await this.toKrw(totalCost, params.symbol);
      await this.reserveFunds(params.userId, reserveKrw.toString(), 'pending');
    } else {
      // 매도 주문: 보유량 검증 + 보유량 예약 (이중 매도 방지)
      // SELL order: validate + reserve holdings (prevents double-sell)
      await this.validateAndReserveHoldings(params.userId, params.symbol, params.quantity);
    }

    // 5. 주문 애그리거트 생성 및 ORDER_PLACED 이벤트 발행 / Create Order Aggregate and raise ORDER_PLACED event
    const isConditional = !!params.triggerPrice && !!params.triggerType;
    const orderId = generateOrderId();
    const order = OrderAggregate.place({
      orderId,
      userId: params.userId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      price: params.type === 'LIMIT' ? params.price! : executionPrice.toString(),
      quantity: params.quantity,
      idempotencyKey: params.idempotencyKey,
      triggerPrice: params.triggerPrice || null,
      triggerType: params.triggerType || null,
    });

    // 6. 이벤트 스토어에 이벤트 저장 / Persist events to event store
    const streamId = OrderAggregate.streamId(orderId);
    const correlationId = generateCorrelationId();

    for (const event of order.uncommittedEvents) {
      await this.eventStore.appendEvent(
        {
          streamId,
          expectedVersion: order.version - order.uncommittedEvents.length + 1 + order.uncommittedEvents.indexOf(event),
          eventType: event.eventType,
          eventData: event.eventData,
          metadata: { correlationId, userId: params.userId },
          eventId: generateEventId(),
        },
        {
          topic: KAFKA_TOPICS.ORDERS_EVENTS,
          partitionKey: orderId,
        },
      );
    }
    order.clearUncommittedEvents();

    // 7. 읽기 모델에 투영 (멱등키 중복 시 기존 주문 반환) / Project to read model (returns existing on duplicate idempotency key)
    const projectionResult = await this.projectOrderPlaced(orderId, params, executionPrice);
    if (projectionResult?.duplicate) {
      return { orderId: projectionResult.orderId, status: projectionResult.status, fills: [] };
    }

    // 7.5 조건부 주문은 매칭 엔진을 건너뛰고 트리거 대기 / Conditional orders skip matching and wait for trigger
    if (isConditional) {
      return {
        orderId,
        status: 'PENDING',
        fills: [],
      };
    }

    // 8. 시장가 주문은 즉시 체결, 지정가 주문은 교차 시도 / For market orders, execute immediately. For limit orders, try crossing first.
    let fills: MatchResult[] = [];
    if (params.type === 'MARKET') {
      fills = await this.executeMarketOrder(order, orderId, params, marketPrice, correlationId);
    } else {
      // 먼저 오더북 교차 시도 / Try crossing the book first
      const crossResult = this.matchingEngine.matchLimitOrder({
        orderId,
        userId: params.userId,
        symbol: params.symbol,
        side: params.side,
        limitPrice: executionPrice,
        quantity,
      });

      if (crossResult.fills.length > 0) {
        fills = await this.processLimitCrossingFills(
          orderId, params, crossResult.fills, correlationId,
        );
      }

      // 미체결 잔량을 오더북에 추가 / Add unfilled remainder to order book
      if (crossResult.remainingQuantity.gt(0)) {
        this.matchingEngine.addToOrderBook({
          orderId,
          userId: params.userId,
          symbol: params.symbol,
          side: params.side,
          price: executionPrice,
          remainingQuantity: crossResult.remainingQuantity,
          timestamp: Date.now(),
        });
      }
    }

    const finalOrder = await this.prisma.orderRead.findUnique({
      where: { orderId },
    });

    return {
      orderId,
      status: finalOrder?.status || 'PENDING',
      fills,
    };
  }

  async cancelOrder(orderId: string, userId: string): Promise<void> {
    const streamId = OrderAggregate.streamId(orderId);
    const events = await this.eventStore.readStream(streamId);

    if (events.length === 0) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    const order = new OrderAggregate();
    order.loadFromHistory(events);

    if (order.userId !== userId) {
      throw new BadRequestException('Cannot cancel another user\'s order');
    }

    order.cancel('User requested cancellation');

    for (const event of order.uncommittedEvents) {
      await this.eventStore.appendEvent(
        {
          streamId,
          expectedVersion: order.version,
          eventType: event.eventType,
          eventData: event.eventData,
          metadata: { userId },
          eventId: generateEventId(),
        },
        {
          topic: KAFKA_TOPICS.ORDERS_EVENTS,
          partitionKey: orderId,
        },
      );
    }
    order.clearUncommittedEvents();

    // 읽기 모델 갱신 + 자금 해제를 단일 트랜잭션으로 처리 — 레이스 컨디션 방지
    // Update read model + release funds atomically — prevents race condition
    await this.prisma.orderRead.update({
      where: { orderId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    // 매수 주문의 예약 자금 해제 (KRW 변환) / Release reserved funds for BUY orders (converted to KRW)
    if (order.side === 'BUY' && order.remainingQuantity) {
      const price = order.price || new Decimal(0);
      const unfilledCost = order.remainingQuantity.mul(price);
      if (unfilledCost.gt(0)) {
        try {
          const releaseKrw = await this.toKrw(unfilledCost, order.symbol);
          await this.releaseFunds(userId, releaseKrw.toString(), orderId);
        } catch (releaseErr) {
          // 자금 해제 실패 시 주문을 CANCELLED 상태에서 롤백하여 재시도 가능하도록 함
          // On release failure, revert order status so cancellation can be retried
          this.logger.error(`[CANCEL_ROLLBACK] Fund release failed for order ${orderId}, reverting to PENDING`);
          await this.prisma.orderRead.update({
            where: { orderId },
            data: { status: order.status, updatedAt: new Date() },
          });
          throw releaseErr;
        }
      }
    } else if (order.side === 'SELL' && order.remainingQuantity) {
      // 매도 주문의 예약 보유량 해제 / Release reserved holdings for SELL orders
      const remainingQty = order.remainingQuantity;
      if (remainingQty.gt(0)) {
        try {
          await this.releaseHoldings(userId, order.symbol, remainingQty.toString(), orderId);
        } catch (releaseErr) {
          // 보유량 해제 실패 시 주문을 CANCELLED 상태에서 롤백하여 재시도 가능하도록 함
          // On release failure, revert order status so cancellation can be retried
          this.logger.error(`[CANCEL_ROLLBACK] Holdings release failed for order ${orderId}, reverting to PENDING`);
          await this.prisma.orderRead.update({
            where: { orderId },
            data: { status: order.status, updatedAt: new Date() },
          });
          throw releaseErr;
        }
      }
    }

    // 오더북에서 제거 / Remove from order book
    this.matchingEngine.removeFromOrderBook(orderId, order.symbol, order.side);
  }

  private readonly orderSelectFields = {
    orderId: true,
    userId: true,
    symbol: true,
    side: true,
    orderType: true,
    price: true,
    quantity: true,
    filledQuantity: true,
    remainingQuantity: true,
    status: true,
    triggerPrice: true,
    triggerType: true,
    triggered: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async getOrder(orderId: string, userId: string) {
    return this.prisma.orderRead.findFirst({
      where: { orderId, userId },
      select: this.orderSelectFields,
    });
  }

  async getUserOrders(userId: string, limit = 50, offset = 0, status?: string) {
    const where: Prisma.OrderReadWhereInput = { userId };
    if (status) {
      where.status = status;
    }
    return this.prisma.orderRead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: this.orderSelectFields,
    });
  }

  async getUserTrades(userId: string, limit = 50, offset = 0): Promise<unknown[]> {
    return this.prisma.tradeRead.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { executedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  getOrderBook(symbol: string) {
    return this.matchingEngine.getOrderBookDepth(symbol);
  }

  async getTradingStats(days: number) {
    const since = new Date(Date.now() - days * 86400000);

    // DB aggregation instead of loading all orders into memory
    const [sideStats, symbolStats, totalAgg] = await Promise.all([
      // Buy/sell count & volume by side
      this.prisma.orderRead.groupBy({
        by: ['side'],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { quantity: true },
      }),
      // Popular assets (top 10 by volume)
      this.prisma.orderRead.groupBy({
        by: ['symbol'],
        where: { createdAt: { gte: since } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      // Total count and volume
      this.prisma.orderRead.aggregate({
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { quantity: true },
      }),
    ]);

    const buyStats = sideStats.find((s) => s.side === 'BUY');
    const sellStats = sideStats.find((s) => s.side === 'SELL');
    const totalOrders = totalAgg._count || 0;
    const totalVolume = Number(totalAgg._sum?.quantity || 0);
    const avgOrderSize = totalOrders > 0 ? totalVolume / totalOrders : 0;

    // Daily volume still needs date grouping - use raw query for efficiency
    const dailyVolume = await this.prisma.$queryRaw<{ date: string; side: string; volume: number }[]>`
      SELECT TO_CHAR("created_at", 'YYYY-MM-DD') AS date, side, COALESCE(SUM(quantity), 0)::float AS volume
      FROM "orders_read"
      WHERE "created_at" >= ${since}
      GROUP BY TO_CHAR("created_at", 'YYYY-MM-DD'), side ORDER BY TO_CHAR("created_at", 'YYYY-MM-DD')
    `;

    const dailyMap: Record<string, { buy: number; sell: number }> = {};
    dailyVolume.forEach((d) => {
      if (!dailyMap[d.date]) dailyMap[d.date] = { buy: 0, sell: 0 };
      if (d.side === 'BUY') dailyMap[d.date].buy = d.volume;
      else dailyMap[d.date].sell = d.volume;
    });
    const dailyVolumeResult = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, buy: v.buy, sell: v.sell, total: v.buy + v.sell }));

    return {
      totalOrders,
      totalVolume,
      avgOrderSize,
      buyCount: buyStats?._count || 0,
      sellCount: sellStats?._count || 0,
      dailyVolume: dailyVolumeResult,
      popularAssets: symbolStats.map((s) => ({ symbol: s.symbol, volume: Number(s._sum?.quantity || 0) })),
    };
  }

  async modifyOrder(
    orderId: string,
    userId: string,
    newPrice: string,
    newQuantity: string,
  ): Promise<{ orderId: string; status: string }> {
    const streamId = OrderAggregate.streamId(orderId);
    const events = await this.eventStore.readStream(streamId);

    if (events.length === 0) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    const order = new OrderAggregate();
    order.loadFromHistory(events);

    if (order.userId !== userId) {
      throw new BadRequestException("Cannot modify another user's order");
    }

    // 수정 전 기존 가격/수량 저장 (자금/보유량 재조정용)
    // Capture old price/quantity before modify (for fund/holdings re-adjustment)
    const oldPrice = order.price || new Decimal(0);
    const oldRemainingQty = order.remainingQuantity || new Decimal(0);

    order.modify(newPrice, newQuantity);

    const correlationId = generateCorrelationId();
    for (const event of order.uncommittedEvents) {
      await this.eventStore.appendEvent(
        {
          streamId,
          expectedVersion: order.version,
          eventType: event.eventType,
          eventData: event.eventData,
          metadata: { correlationId, userId },
          eventId: generateEventId(),
        },
        {
          topic: KAFKA_TOPICS.ORDERS_EVENTS,
          partitionKey: orderId,
        },
      );
    }
    order.clearUncommittedEvents();

    // 읽기 모델 갱신 / Update read model
    await this.prisma.orderRead.update({
      where: { orderId },
      data: {
        price: newPrice,
        remainingQuantity: newQuantity,
        quantity: order.quantity.toString(),
        updatedAt: new Date(),
      },
    });

    // 자금/보유량 재조정: 가격/수량 변경에 따른 차액 예약 또는 해제
    // Re-adjust funds/holdings: reserve or release the difference due to price/quantity changes
    const newPriceDec = new Decimal(newPrice);
    const newQtyDec = new Decimal(newQuantity);

    if (order.side === 'BUY') {
      const oldCost = oldPrice.mul(oldRemainingQty);
      const newCost = newPriceDec.mul(newQtyDec);
      const diff = newCost.minus(oldCost);

      if (diff.gt(0)) {
        // 새 비용이 더 크면 추가 자금 예약 / New cost is higher — reserve additional funds
        const diffKrw = await this.toKrw(diff, order.symbol);
        await this.reserveFunds(userId, diffKrw.toString(), orderId);
      } else if (diff.lt(0)) {
        // 새 비용이 더 작으면 차액 해제 / New cost is lower — release the difference
        const diffKrw = await this.toKrw(diff.abs(), order.symbol);
        await this.releaseFunds(userId, diffKrw.toString(), orderId);
      }
    } else if (order.side === 'SELL') {
      const qtyDiff = newQtyDec.minus(oldRemainingQty);

      if (qtyDiff.gt(0)) {
        // 매도 수량 증가 — 추가 보유량 예약 / Sell quantity increased — reserve additional holdings
        await this.validateAndReserveHoldings(userId, order.symbol, qtyDiff.toString());
      } else if (qtyDiff.lt(0)) {
        // 매도 수량 감소 — 차액 보유량 해제 / Sell quantity decreased — release the difference
        await this.releaseHoldings(userId, order.symbol, qtyDiff.abs().toString(), orderId);
      }
    }

    // 오더북 갱신 (제거 후 재삽입, 시간 우선순위 상실) / Update in order book (removes and re-inserts, losing time priority)
    this.matchingEngine.modifyOrderInBook({
      orderId,
      userId,
      symbol: order.symbol,
      side: order.side,
      newPrice: new Decimal(newPrice),
      newQuantity: new Decimal(newQuantity),
    });

    return { orderId, status: order.status };
  }

  /**
   * 조건부 주문의 트리거 확인 / Check conditional order triggers
   * 현재가가 트리거 조건에 도달하면 시장가로 자동 실행합니다
   * Auto-executes as a market order when trigger conditions are met
   */
  async checkTriggers(symbol: string, currentPrice: string): Promise<{ triggered: number }> {
    const price = new Decimal(currentPrice);

    // 해당 심볼의 미발동 조건부 주문 조회 / Query untriggered conditional orders for this symbol
    const conditionalOrders = await this.prisma.orderRead.findMany({
      where: {
        symbol,
        triggerType: { not: null },
        triggered: false,
        status: 'PENDING',
      },
    });

    let triggeredCount = 0;

    for (const order of conditionalOrders) {
      if (!order.triggerPrice || !order.triggerType) continue;

      const triggerPrice = new Decimal(order.triggerPrice.toString());
      let shouldTrigger = false;

      if (order.triggerType === 'STOP_LOSS') {
        // 매수 손절: 현재가 >= 트리거가 / BUY stop-loss: trigger when price rises to or above
        // 매도 손절: 현재가 <= 트리거가 / SELL stop-loss: trigger when price falls to or below
        shouldTrigger = order.side === 'BUY'
          ? price.gte(triggerPrice)
          : price.lte(triggerPrice);
      } else if (order.triggerType === 'TAKE_PROFIT') {
        // 매수 익절: 현재가 <= 트리거가 / BUY take-profit: trigger when price falls to or below
        // 매도 익절: 현재가 >= 트리거가 / SELL take-profit: trigger when price rises to or above
        shouldTrigger = order.side === 'BUY'
          ? price.lte(triggerPrice)
          : price.gte(triggerPrice);
      }

      if (shouldTrigger) {
        // 원자적 트리거 발동: triggered: false 조건부 업데이트로 TOCTOU 레이스 방지
        // Atomic trigger claim: updateMany with triggered: false prevents TOCTOU race condition
        const claimResult = await this.prisma.orderRead.updateMany({
          where: {
            orderId: order.orderId,
            triggered: false,
            status: 'PENDING',
          },
          data: { triggered: true, updatedAt: new Date() },
        });

        // count === 0이면 다른 인스턴스가 먼저 트리거를 발동함 — 건너뛰기
        // If count === 0, another instance already claimed this trigger — skip
        if (claimResult.count === 0) {
          this.logger.debug(`Trigger for order ${order.orderId} already claimed by another instance`);
          continue;
        }

        // 시장가 주문으로 매칭 엔진 실행 / Execute as market order via matching engine
        try {
          const marketPrice = await this.getMarketPrice(symbol);
          if (!marketPrice) continue;

          const streamId = OrderAggregate.streamId(order.orderId);
          const events = await this.eventStore.readStream(streamId);
          const aggregate = new OrderAggregate();
          aggregate.loadFromHistory(events);

          const correlationId = generateCorrelationId();
          const fills = this.matchingEngine.matchMarketOrder({
            orderId: order.orderId,
            userId: order.userId,
            symbol: order.symbol,
            side: order.side as 'BUY' | 'SELL',
            quantity: new Decimal(order.remainingQuantity.toString()),
            marketPrice,
          });

          for (const fill of fills) {
            aggregate.match(
              fill.matchedQuantity,
              fill.matchedPrice,
              fill.tradeId,
              fill.buyOrderId === order.orderId ? fill.sellOrderId : fill.buyOrderId,
            );

            for (const event of aggregate.uncommittedEvents) {
              await this.eventStore.appendEvent(
                {
                  streamId,
                  expectedVersion: aggregate.version - aggregate.uncommittedEvents.length + 1 + aggregate.uncommittedEvents.indexOf(event),
                  eventType: event.eventType,
                  eventData: event.eventData,
                  metadata: { correlationId, userId: order.userId },
                  eventId: generateEventId(),
                },
                {
                  topic: KAFKA_TOPICS.ORDERS_EVENTS,
                  partitionKey: order.orderId,
                },
              );
            }
            aggregate.clearUncommittedEvents();

            await this.projectTrade(fill);
            await this.settleTrade(fill);
          }

          // 읽기 모델 갱신 / Update read model
          await this.prisma.orderRead.update({
            where: { orderId: order.orderId },
            data: {
              filledQuantity: aggregate.filledQuantity?.toString() || '0',
              remainingQuantity: aggregate.remainingQuantity?.toString() || '0',
              status: aggregate.status,
              updatedAt: new Date(),
            },
          });

          triggeredCount++;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to execute triggered order ${order.orderId}: ${message}`);
        }
      }
    }

    return { triggered: triggeredCount };
  }

  // ---- 비공개 헬퍼 메서드 / Private helpers ----

  /**
   * 지수 백오프 재시도 — 일시적 네트워크 장애에 대응.
   * 4xx 클라이언트 에러는 재시도하지 않습니다 (클라이언트 문제이므로).
   *
   * Exponential backoff retry — handles transient network failures.
   * Does not retry 4xx client errors (they won't self-heal).
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    label: string,
    maxRetries = 3,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        // 4xx 에러는 재시도 불필요 (클라이언트 에러) / Don't retry 4xx client errors
        const axiosErr = error as { response?: { status?: number } };
        const status = axiosErr?.response?.status;
        if (status && status >= 400 && status < 500) {
          throw error;
        }
        this.logger.warn(`${label} attempt ${attempt}/${maxRetries} failed`);
        if (attempt === maxRetries) throw error;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    throw new Error(`${label} failed after ${maxRetries} retries`);
  }

  private async processLimitCrossingFills(
    orderId: string,
    params: PlaceOrderParams,
    fills: MatchResult[],
    correlationId: string,
  ): Promise<MatchResult[]> {
    const streamId = OrderAggregate.streamId(orderId);
    const events = await this.eventStore.readStream(streamId);
    const aggregate = new OrderAggregate();
    aggregate.loadFromHistory(events);

    for (const fill of fills) {
      aggregate.match(
        fill.matchedQuantity,
        fill.matchedPrice,
        fill.tradeId,
        fill.buyOrderId === orderId ? fill.sellOrderId : fill.buyOrderId,
      );

      for (const event of aggregate.uncommittedEvents) {
        await this.eventStore.appendEvent(
          {
            streamId,
            expectedVersion: aggregate.version - aggregate.uncommittedEvents.length + 1 + aggregate.uncommittedEvents.indexOf(event),
            eventType: event.eventType,
            eventData: event.eventData,
            metadata: { correlationId, userId: params.userId },
            eventId: generateEventId(),
          },
          {
            topic: KAFKA_TOPICS.ORDERS_EVENTS,
            partitionKey: orderId,
          },
        );
      }
      aggregate.clearUncommittedEvents();

      await this.projectTrade(fill);
      await this.settleTrade(fill);
    }

    // 주문 읽기 모델 갱신 / Update order read model
    await this.prisma.orderRead.update({
      where: { orderId },
      data: {
        filledQuantity: aggregate.filledQuantity?.toString() || '0',
        remainingQuantity: aggregate.remainingQuantity?.toString() || '0',
        status: aggregate.status,
        updatedAt: new Date(),
      },
    });

    return fills;
  }

  private async executeMarketOrder(
    _order: OrderAggregate,
    orderId: string,
    params: PlaceOrderParams,
    marketPrice: Decimal,
    correlationId: string,
  ): Promise<MatchResult[]> {
    const fills = this.matchingEngine.matchMarketOrder({
      orderId,
      userId: params.userId,
      symbol: params.symbol,
      side: params.side,
      quantity: new Decimal(params.quantity),
      marketPrice,
    });

    // 이벤트 스토어에서 애그리거트 재로드 / Reload aggregate from event store to apply matches
    const streamId = OrderAggregate.streamId(orderId);
    const events = await this.eventStore.readStream(streamId);
    const aggregate = new OrderAggregate();
    aggregate.loadFromHistory(events);

    for (const fill of fills) {
      aggregate.match(
        fill.matchedQuantity,
        fill.matchedPrice,
        fill.tradeId,
        fill.buyOrderId === orderId ? fill.sellOrderId : fill.buyOrderId,
      );

      // 매칭 이벤트 저장 / Persist match events
      for (const event of aggregate.uncommittedEvents) {
        await this.eventStore.appendEvent(
          {
            streamId,
            expectedVersion: aggregate.version - aggregate.uncommittedEvents.length + 1 + aggregate.uncommittedEvents.indexOf(event),
            eventType: event.eventType,
            eventData: event.eventData,
            metadata: { correlationId, userId: params.userId },
            eventId: generateEventId(),
          },
          {
            topic: KAFKA_TOPICS.ORDERS_EVENTS,
            partitionKey: orderId,
          },
        );
      }
      aggregate.clearUncommittedEvents();

      // 체결 내역을 읽기 모델에 투영 / Project trade to read model
      await this.projectTrade(fill);

      // 포트폴리오 서비스에서 정산 / Settle in portfolio service
      await this.settleTrade(fill);
    }

    // 최종 상태로 주문 읽기 모델 갱신 / Update order read model with final state
    await this.prisma.orderRead.update({
      where: { orderId },
      data: {
        filledQuantity: aggregate.filledQuantity?.toString() || '0',
        remainingQuantity: aggregate.remainingQuantity?.toString() || '0',
        status: aggregate.status,
        updatedAt: new Date(),
      },
    });

    return fills;
  }

  /**
   * Market Data 서비스에서 현재 시장 가격을 조회합니다.
   * 내부 서비스 통신이므로 x-internal-token 헤더를 사용합니다.
   *
   * Fetches current market price from Market Data service.
   * Uses x-internal-token header for inter-service communication.
   */
  private async getMarketPrice(symbol: string): Promise<Decimal | null> {
    try {
      const response = await axios.get(
        `${this.marketDataUrl}/market/prices/${symbol}`,
        { timeout: this.httpTimeout, headers: { 'x-internal-token': this.internalToken } },
      );
      if (response.data?.success && response.data?.data?.price) {
        return new Decimal(response.data.data.price);
      }
      return null;
    } catch {
      this.logger.warn(`Failed to fetch market price for ${symbol}`);
      return null;
    }
  }

  /**
   * Portfolio 서비스에 자금 예약 요청.
   * 매수 주문 전 사용자의 가용 현금에서 예약 현금으로 이동시킵니다.
   *
   * Request fund reservation from Portfolio service.
   * Moves user's available cash to reserved cash before placing a buy order.
   */
  private async reserveFunds(
    userId: string,
    amount: string,
    _orderId: string,
  ): Promise<void> {
    try {
      await this.withRetry(
        () => axios.post(
          `${this.portfolioUrl}/portfolio/internal/reserve`,
          { amount },
          { headers: { 'x-user-id': userId, 'x-internal-token': this.internalToken }, timeout: this.httpTimeout },
        ),
        `reserveFunds(user=${userId.substring(0, 8)}...)`,
      );
    } catch (error: unknown) {
      // axios 에러의 경우 portfolio 서비스의 실제 에러 메시지를 추출
      const axiosErr = error as { response?: { data?: { message?: string | string[] } } };
      const respMsg = axiosErr?.response?.data?.message;
      if (respMsg) {
        const msg = typeof respMsg === 'string' ? respMsg : Array.isArray(respMsg) ? respMsg[0] : '';
        if (msg) {
          throw new BadRequestException(msg);
        }
      }
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to reserve funds: ${message}`);
    }
  }

  private async releaseFunds(
    userId: string,
    amount: string,
    orderId: string,
  ): Promise<void> {
    try {
      await this.withRetry(
        () => axios.post(
          `${this.portfolioUrl}/portfolio/internal/release`,
          { amount, orderId },
          { headers: { 'x-user-id': userId, 'x-internal-token': this.internalToken }, timeout: this.httpTimeout },
        ),
        `releaseFunds(order=${orderId})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[FUNDS_FROZEN] Failed to release funds for order ${orderId}, user=${userId.substring(0, 8)}..., amount=${amount}: ${message}`,
      );
    }
  }

  private async validateAndReserveHoldings(
    userId: string,
    symbol: string,
    quantity: string,
  ): Promise<void> {
    try {
      await this.withRetry(
        () => axios.post(
          `${this.portfolioUrl}/portfolio/internal/reserve-holdings`,
          { symbol, quantity },
          { headers: { 'x-user-id': userId, 'x-internal-token': this.internalToken }, timeout: this.httpTimeout },
        ),
        `reserveHoldings(user=${userId.substring(0, 8)}..., ${symbol})`,
      );
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      const axiosErr = error as { response?: { data?: { message?: string | string[] } } };
      const respMsg = axiosErr?.response?.data?.message;
      if (respMsg) {
        const msg = typeof respMsg === 'string' ? respMsg : Array.isArray(respMsg) ? respMsg[0] : '';
        if (msg) throw new BadRequestException(msg);
      }
      throw new BadRequestException(`Insufficient holdings for ${symbol}`);
    }
  }

  private async releaseHoldings(
    userId: string,
    symbol: string,
    quantity: string,
    orderId: string,
  ): Promise<void> {
    try {
      await this.withRetry(
        () => axios.post(
          `${this.portfolioUrl}/portfolio/internal/release-holdings`,
          { symbol, quantity, orderId },
          { headers: { 'x-user-id': userId, 'x-internal-token': this.internalToken }, timeout: this.httpTimeout },
        ),
        `releaseHoldings(order=${orderId}, ${symbol})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[HOLDINGS_FROZEN] Failed to release holdings for order ${orderId}, user=${userId.substring(0, 8)}..., symbol=${symbol}, qty=${quantity}: ${message}`,
      );
    }
  }

  /**
   * 체결된 거래를 Portfolio 서비스에서 정산합니다.
   * 매수자와 매도자 각각에 대해 settle-buy/settle-sell API를 호출합니다.
   * MARKET_MAKER_ID(가상 시장 조성자)에 대해서는 정산을 건너뜁니다.
   *
   * Settles executed trades in Portfolio service.
   * Calls settle-buy/settle-sell API for both buyer and seller.
   * Skips settlement for MARKET_MAKER_ID (virtual market maker).
   */
  private async settleTrade(fill: MatchResult): Promise<void> {
    // USD 가격을 KRW로 변환 / Convert USD price to KRW for portfolio settlement
    const krwPrice = await this.toKrw(new Decimal(fill.matchedPrice), fill.symbol);
    const priceForPortfolio = krwPrice.toString();

    // 매수자 정산 / Settle buyer side
    const MARKET_MAKER_ID = '00000000-0000-0000-0000-000000000000';
    if (fill.buyerId !== MARKET_MAKER_ID) {
      try {
        await this.withRetry(
          () => axios.post(
            `${this.portfolioUrl}/portfolio/internal/settle-buy`,
            {
              symbol: fill.symbol,
              quantity: fill.matchedQuantity,
              price: priceForPortfolio,
              tradeId: fill.tradeId,
            },
            { headers: { 'x-user-id': fill.buyerId, 'x-internal-token': this.internalToken }, timeout: this.httpTimeout },
          ),
          `settleBuy(trade=${fill.tradeId})`,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[SETTLE_FAILED] Buy settlement failed for trade ${fill.tradeId}, buyer=${fill.buyerId.substring(0, 8)}...: ${message}`,
        );
      }
    }

    // 매도자 정산 / Settle seller side
    if (fill.sellerId !== MARKET_MAKER_ID) {
      try {
        await this.withRetry(
          () => axios.post(
            `${this.portfolioUrl}/portfolio/internal/settle-sell`,
            {
              symbol: fill.symbol,
              quantity: fill.matchedQuantity,
              price: priceForPortfolio,
              tradeId: fill.tradeId,
            },
            { headers: { 'x-user-id': fill.sellerId, 'x-internal-token': this.internalToken }, timeout: this.httpTimeout },
          ),
          `settleSell(trade=${fill.tradeId})`,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[SETTLE_FAILED] Sell settlement failed for trade ${fill.tradeId}, seller=${fill.sellerId.substring(0, 8)}...: ${message}`,
        );
      }
    }
  }

  /**
   * 읽기 모델에 주문을 투영합니다. idempotencyKey 유니크 제약 조건 위반(P2002) 시
   * 중복 주문으로 판단하고 기존 주문을 반환합니다 — TOCTOU 경쟁 조건을 DB 수준에서 방지합니다.
   *
   * Projects the order into the read model. If a P2002 unique constraint violation
   * occurs on idempotencyKey, the duplicate is detected atomically at the DB level,
   * preventing TOCTOU race conditions. Returns the existing order if duplicate.
   */
  private async projectOrderPlaced(
    orderId: string,
    params: PlaceOrderParams,
    executionPrice: Decimal,
  ): Promise<{ duplicate: true; orderId: string; status: string } | void> {
    try {
      await this.prisma.orderRead.create({
        data: {
          orderId,
          userId: params.userId,
          symbol: params.symbol,
          side: params.side,
          orderType: params.type,
          price: params.type === 'LIMIT' ? new Decimal(params.price!) : executionPrice,
          quantity: new Decimal(params.quantity),
          filledQuantity: new Decimal(0),
          remainingQuantity: new Decimal(params.quantity),
          status: 'PENDING',
          triggerPrice: params.triggerPrice ? new Decimal(params.triggerPrice) : null,
          triggerType: params.triggerType || null,
          triggered: false,
          idempotencyKey: params.idempotencyKey,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastEventPosition: 0,
        },
      });
    } catch (error: unknown) {
      // P2002 = Prisma unique constraint violation (idempotencyKey 중복)
      // P2002 = Prisma unique constraint violation (duplicate idempotencyKey)
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        this.logger.warn(
          `Duplicate idempotencyKey detected (race condition resolved): ${params.idempotencyKey}`,
        );
        const dup = await this.prisma.orderRead.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (dup) {
          return { duplicate: true, orderId: dup.orderId, status: dup.status };
        }
      }
      throw error;
    }
  }

  private async projectTrade(fill: MatchResult): Promise<void> {
    const qty = new Decimal(fill.matchedQuantity);
    const price = new Decimal(fill.matchedPrice);

    await this.prisma.tradeRead.create({
      data: {
        tradeId: fill.tradeId,
        buyOrderId: fill.buyOrderId,
        sellOrderId: fill.sellOrderId,
        buyerId: fill.buyerId,
        sellerId: fill.sellerId,
        symbol: fill.symbol,
        price,
        quantity: qty,
        total: qty.mul(price),
        executedAt: new Date(),
      },
    });
  }
}
