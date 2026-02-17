import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventStoreService } from '@mock-exchange/event-store';
import {
  KAFKA_TOPICS,
  generateOrderId,
  generateEventId,
  generateCorrelationId,
} from '@mock-exchange/common';
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
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly marketDataUrl: string;
  private readonly portfolioUrl: string;

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly matchingEngine: MatchingEngineService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.marketDataUrl = this.config.get<string>(
      'MARKET_DATA_URL',
      'http://localhost:3003',
    );
    this.portfolioUrl = this.config.get<string>(
      'PORTFOLIO_URL',
      'http://localhost:3004',
    );
  }

  async placeOrder(params: PlaceOrderParams): Promise<{
    orderId: string;
    status: string;
    fills: MatchResult[];
  }> {
    // 1. Idempotency check
    const existing = await this.prisma.orderRead.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return { orderId: existing.orderId, status: existing.status, fills: [] };
    }

    // 2. Validate symbol and get current price
    const marketPrice = await this.getMarketPrice(params.symbol);
    if (!marketPrice) {
      throw new BadRequestException(`Symbol ${params.symbol} not found or price unavailable`);
    }

    // 3. Determine execution price
    const executionPrice =
      params.type === 'MARKET'
        ? marketPrice
        : new Decimal(params.price!);

    const quantity = new Decimal(params.quantity);
    const totalCost = executionPrice.mul(quantity);

    // 4. For BUY orders, reserve funds in portfolio service
    if (params.side === 'BUY') {
      await this.reserveFunds(params.userId, totalCost.toString(), 'pending');
    }

    // 5. Create Order Aggregate and raise ORDER_PLACED event
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
    });

    // 6. Persist events to event store
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

    // 7. Project to read model
    await this.projectOrderPlaced(orderId, params, executionPrice);

    // 8. For market orders, execute immediately. For limit orders, try crossing first.
    let fills: MatchResult[] = [];
    if (params.type === 'MARKET') {
      fills = await this.executeMarketOrder(order, orderId, params, marketPrice, correlationId);
    } else {
      // Try crossing the book first
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

      // Add unfilled remainder to order book
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

    // Update read model
    await this.prisma.orderRead.update({
      where: { orderId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    // Release reserved funds for BUY orders
    if (order.side === 'BUY' && order.remainingQuantity) {
      const price = order.price || new Decimal(0);
      const unfilledCost = order.remainingQuantity.mul(price);
      if (unfilledCost.gt(0)) {
        await this.releaseFunds(userId, unfilledCost.toString(), orderId);
      }
    }

    // Remove from order book
    this.matchingEngine.removeFromOrderBook(orderId, order.symbol, order.side);
  }

  async getOrder(orderId: string): Promise<unknown> {
    return this.prisma.orderRead.findUnique({ where: { orderId } });
  }

  async getUserOrders(userId: string, limit = 50, offset = 0): Promise<unknown[]> {
    return this.prisma.orderRead.findMany({
      where: { userId },
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

    // Update read model
    await this.prisma.orderRead.update({
      where: { orderId },
      data: {
        price: newPrice,
        remainingQuantity: newQuantity,
        quantity: order.quantity.toString(),
        updatedAt: new Date(),
      },
    });

    // Update in order book (removes and re-inserts, losing time priority)
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

  // ---- Private helpers ----

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

    // Update order read model
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

    // Reload aggregate from event store to apply matches
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

      // Persist match events
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

      // Project trade to read model
      await this.projectTrade(fill);

      // Settle in portfolio service
      await this.settleTrade(fill);
    }

    // Update order read model with final state
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
        { timeout: 5000 },
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
        { headers: { 'x-user-id': userId }, timeout: 5000 },
      );
    } catch (error: unknown) {
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
        { headers: { 'x-user-id': userId }, timeout: 5000 },
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to release funds for order ${orderId}: ${error}`);
    }
  }

  private async settleTrade(fill: MatchResult): Promise<void> {
    try {
      // Settle buyer side
      if (fill.buyerId !== 'MARKET_MAKER') {
        await axios.post(
          `${this.portfolioUrl}/portfolio/internal/settle-buy`,
          {
            symbol: fill.symbol,
            quantity: fill.matchedQuantity,
            price: fill.matchedPrice,
            tradeId: fill.tradeId,
          },
          { headers: { 'x-user-id': fill.buyerId }, timeout: 5000 },
        );
      }

      // Settle seller side
      if (fill.sellerId !== 'MARKET_MAKER') {
        await axios.post(
          `${this.portfolioUrl}/portfolio/internal/settle-sell`,
          {
            symbol: fill.symbol,
            quantity: fill.matchedQuantity,
            price: fill.matchedPrice,
            tradeId: fill.tradeId,
          },
          { headers: { 'x-user-id': fill.sellerId }, timeout: 5000 },
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
