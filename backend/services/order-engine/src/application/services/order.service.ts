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

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly matchingEngine: MatchingEngineService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.marketDataUrl = this.config.get<string>(
      'MARKET_DATA_URL',
      'http://localhost:3001',
    );
    this.portfolioUrl = this.config.get<string>(
      'PORTFOLIO_URL',
      'http://localhost:3003',
    );
    this.internalToken = this.config.get<string>('INTERNAL_SERVICE_SECRET', '');
  }

  async placeOrder(params: PlaceOrderParams): Promise<{
    orderId: string;
    status: string;
    fills: MatchResult[];
  }> {
    // 1. 멱등성 검사 / Idempotency check
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

    // 4. 매수 주문 시 자금 예약, 매도 주문 시 보유량 검증
    // For BUY orders reserve funds, for SELL orders validate holdings
    if (params.side === 'BUY') {
      await this.reserveFunds(params.userId, totalCost.toString(), 'pending');
    } else {
      await this.validateHoldings(params.userId, params.symbol, params.quantity);
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
          expectedVersion: order.version - order.uncommittedEvents.length + order.uncommittedEvents.indexOf(event),
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

    // 7. 읽기 모델에 투영 / Project to read model
    await this.projectOrderPlaced(orderId, params, executionPrice);

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

    // 읽기 모델 갱신 / Update read model
    await this.prisma.orderRead.update({
      where: { orderId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    // 매수 주문의 예약 자금 해제 / Release reserved funds for BUY orders
    if (order.side === 'BUY' && order.remainingQuantity) {
      const price = order.price || new Decimal(0);
      const unfilledCost = order.remainingQuantity.mul(price);
      if (unfilledCost.gt(0)) {
        await this.releaseFunds(userId, unfilledCost.toString(), orderId);
      }
    }

    // 오더북에서 제거 / Remove from order book
    this.matchingEngine.removeFromOrderBook(orderId, order.symbol, order.side);
  }

  async getOrder(orderId: string, userId: string): Promise<unknown> {
    return this.prisma.orderRead.findFirst({ where: { orderId, userId } });
  }

  async getUserOrders(userId: string, limit = 50, offset = 0, status?: string): Promise<unknown[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    return this.prisma.orderRead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
        // 트리거 발동 표시 / Mark as triggered
        await this.prisma.orderRead.update({
          where: { orderId: order.orderId },
          data: { triggered: true, updatedAt: new Date() },
        });

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
                  expectedVersion: aggregate.version - aggregate.uncommittedEvents.length + aggregate.uncommittedEvents.indexOf(event),
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
          this.logger.error(`Failed to execute triggered order ${order.orderId}: ${error}`);
        }
      }
    }

    return { triggered: triggeredCount };
  }

  // ---- 비공개 헬퍼 메서드 / Private helpers ----

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
            expectedVersion: aggregate.version - aggregate.uncommittedEvents.length + aggregate.uncommittedEvents.indexOf(event),
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
            expectedVersion: aggregate.version - aggregate.uncommittedEvents.length + aggregate.uncommittedEvents.indexOf(event),
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

  private async getMarketPrice(symbol: string): Promise<Decimal | null> {
    try {
      const response = await axios.get(
        `${this.marketDataUrl}/market/prices/${symbol}`,
        { timeout: 5000, headers: { 'x-internal-token': this.internalToken } },
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

  private async reserveFunds(
    userId: string,
    amount: string,
    _orderId: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.portfolioUrl}/portfolio/internal/reserve`,
        { amount },
        { headers: { 'x-user-id': userId, 'x-internal-token': this.internalToken }, timeout: 5000 },
      );
    } catch (error: any) {
      // axios 에러의 경우 portfolio 서비스의 실제 에러 메시지를 추출
      const respMsg = error?.response?.data?.message;
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
      await axios.post(
        `${this.portfolioUrl}/portfolio/internal/release`,
        { amount, orderId },
        { headers: { 'x-user-id': userId, 'x-internal-token': this.internalToken }, timeout: 5000 },
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to release funds for order ${orderId}: ${error}`);
    }
  }

  private async validateHoldings(
    userId: string,
    symbol: string,
    quantity: string,
  ): Promise<void> {
    try {
      const response = await axios.get(
        `${this.portfolioUrl}/portfolio/internal/holding`,
        {
          params: { symbol },
          headers: { 'x-user-id': userId, 'x-internal-token': this.internalToken },
          timeout: 5000,
        },
      );

      const holding = response.data?.data;
      if (!holding || parseFloat(holding.quantity) <= 0) {
        throw new BadRequestException(`No holding found for symbol ${symbol}`);
      }

      const available = parseFloat(holding.quantity);
      const requested = parseFloat(quantity);
      if (available < requested) {
        throw new BadRequestException(
          `Insufficient holdings: available ${available} ${symbol}, requested ${requested}`,
        );
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      const respMsg = error?.response?.data?.message;
      if (respMsg) {
        const msg = typeof respMsg === 'string' ? respMsg : Array.isArray(respMsg) ? respMsg[0] : '';
        if (msg) {
          throw new BadRequestException(msg);
        }
      }
      throw new BadRequestException(`Insufficient holdings for ${symbol}`);
    }
  }

  private async settleTrade(fill: MatchResult): Promise<void> {
    try {
      // 매수자 정산 / Settle buyer side
      if (fill.buyerId !== 'MARKET_MAKER') {
        await axios.post(
          `${this.portfolioUrl}/portfolio/internal/settle-buy`,
          {
            symbol: fill.symbol,
            quantity: fill.matchedQuantity,
            price: fill.matchedPrice,
            tradeId: fill.tradeId,
          },
          { headers: { 'x-user-id': fill.buyerId, 'x-internal-token': this.internalToken }, timeout: 5000 },
        );
      }

      // 매도자 정산 / Settle seller side
      if (fill.sellerId !== 'MARKET_MAKER') {
        await axios.post(
          `${this.portfolioUrl}/portfolio/internal/settle-sell`,
          {
            symbol: fill.symbol,
            quantity: fill.matchedQuantity,
            price: fill.matchedPrice,
            tradeId: fill.tradeId,
          },
          { headers: { 'x-user-id': fill.sellerId, 'x-internal-token': this.internalToken }, timeout: 5000 },
        );
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to settle trade ${fill.tradeId}: ${error}`);
    }
  }

  private async projectOrderPlaced(
    orderId: string,
    params: PlaceOrderParams,
    executionPrice: Decimal,
  ): Promise<void> {
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
