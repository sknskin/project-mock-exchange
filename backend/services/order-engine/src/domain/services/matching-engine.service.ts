/**
 * @file 주문 매칭 엔진
 * @description 시장가/지정가 주문을 매칭하는 핵심 매칭 알고리즘
 *
 * @file Order Matching Engine
 * @description Core matching algorithm for market and limit orders
 */
import { Injectable, Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { generateTradeId } from '@virtuex/common';

export interface OrderBookEntry {
  orderId: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: Decimal;
  remainingQuantity: Decimal;
  timestamp: number;
}

export interface MatchResult {
  tradeId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  symbol: string;
  matchedQuantity: string;
  matchedPrice: string;
}

@Injectable()
export class MatchingEngineService {
  private readonly logger = new Logger(MatchingEngineService.name);

  // 인메모리 오더북: 종목 -> { 매수호가 (내림차순), 매도호가 (오름차순) } / In-memory order books: symbol -> { bids (sorted desc), asks (sorted asc) }
  private readonly bids = new Map<string, OrderBookEntry[]>();
  private readonly asks = new Map<string, OrderBookEntry[]>();

  addToOrderBook(entry: OrderBookEntry): void {
    if (entry.side === 'BUY') {
      const book = this.bids.get(entry.symbol) || [];
      book.push(entry);
      // 매수호가 정렬: 최고가 우선, 동일가는 시간 우선 / Sort bids: highest price first, then earliest timestamp
      book.sort((a, b) => {
        const priceDiff = b.price.minus(a.price).toNumber();
        return priceDiff !== 0 ? priceDiff : a.timestamp - b.timestamp;
      });
      this.bids.set(entry.symbol, book);
    } else {
      const book = this.asks.get(entry.symbol) || [];
      book.push(entry);
      // 매도호가 정렬: 최저가 우선, 동일가는 시간 우선 / Sort asks: lowest price first, then earliest timestamp
      book.sort((a, b) => {
        const priceDiff = a.price.minus(b.price).toNumber();
        return priceDiff !== 0 ? priceDiff : a.timestamp - b.timestamp;
      });
      this.asks.set(entry.symbol, book);
    }
  }

  removeFromOrderBook(orderId: string, symbol: string, side: 'BUY' | 'SELL'): void {
    const book = side === 'BUY' ? this.bids : this.asks;
    const entries = book.get(symbol);
    if (entries) {
      book.set(
        symbol,
        entries.filter((e) => e.orderId !== orderId),
      );
    }
  }

  /**
   * 시장가 주문을 오더북과 매칭합니다.
   * 시장가 매수는 매도호가(최저가 우선)와 매칭합니다.
   * 시장가 매도는 매수호가(최고가 우선)와 매칭합니다.
   *
   * Match a market order against the order book.
   * Market BUY matches against asks (lowest price first).
   * Market SELL matches against bids (highest price first).
   */
  matchMarketOrder(params: {
    orderId: string;
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: Decimal;
    marketPrice: Decimal;
  }): MatchResult[] {
    const { orderId, userId, symbol, side, quantity, marketPrice } = params;
    const matches: MatchResult[] = [];

    // Phase 1에서 시장가 주문은 현재 시장가로 가용 유동성에 대해 체결합니다.
    // 지정가 주문이 없으면 시장가로 체결을 시뮬레이션합니다 (항상 마켓 메이커가 있는 것처럼).
    // For market orders in Phase 1, we execute at the current market price
    // against the available liquidity. If no limit orders exist,
    // we simulate a fill at market price (as if there's always a market maker).

    const counterBook = side === 'BUY' ? this.asks : this.bids;
    const entries = counterBook.get(symbol) || [];
    let remainingQty = quantity;

    // 기존 지정가 주문과 먼저 매칭 시도 / Try to match against existing limit orders first
    const toRemove: string[] = [];

    for (const entry of entries) {
      if (remainingQty.isZero()) break;

      // 시장가 매수: 매도호가의 가격으로 매칭 / For market buys: match against asks at their ask price
      // 시장가 매도: 매수호가의 가격으로 매칭 / For market sells: match against bids at their bid price
      const matchQty = Decimal.min(remainingQty, entry.remainingQuantity);
      const matchPrice = entry.price;

      const tradeId = generateTradeId();
      matches.push({
        tradeId,
        buyOrderId: side === 'BUY' ? orderId : entry.orderId,
        sellOrderId: side === 'SELL' ? orderId : entry.orderId,
        buyerId: side === 'BUY' ? userId : entry.userId,
        sellerId: side === 'SELL' ? userId : entry.userId,
        symbol,
        matchedQuantity: matchQty.toString(),
        matchedPrice: matchPrice.toString(),
      });

      entry.remainingQuantity = entry.remainingQuantity.minus(matchQty);
      remainingQty = remainingQty.minus(matchQty);

      if (entry.remainingQuantity.isZero()) {
        toRemove.push(entry.orderId);
      }
    }

    // 전량 체결된 주문 제거 / Remove fully filled entries
    if (toRemove.length > 0) {
      counterBook.set(
        symbol,
        entries.filter((e) => !toRemove.includes(e.orderId)),
      );
    }

    // 잔여 수량이 있으면 (매칭할 지정가 주문 없음) 시장가로 체결 / If still remaining quantity (no limit orders to match), fill at market price
    if (remainingQty.gt(0)) {
      const tradeId = generateTradeId();
      matches.push({
        tradeId,
        buyOrderId: side === 'BUY' ? orderId : 'MARKET_MAKER',
        sellOrderId: side === 'SELL' ? orderId : 'MARKET_MAKER',
        buyerId: side === 'BUY' ? userId : 'MARKET_MAKER',
        sellerId: side === 'SELL' ? userId : 'MARKET_MAKER',
        symbol,
        matchedQuantity: remainingQty.toString(),
        matchedPrice: marketPrice.toString(),
      });
    }

    this.logger.log(
      `Matched market ${side} order ${orderId}: ${matches.length} fills for ${symbol}`,
    );

    return matches;
  }

  /**
   * 새 지정가 주문을 반대편 오더북과 매칭합니다.
   * 지정가 매수: 매도호가 <= 지정가인 주문과 매칭 (가격-시간 우선).
   * 지정가 매도: 매수호가 >= 지정가인 주문과 매칭.
   * 교차 발생 시 체결 내역을 반환합니다. 미체결분은 오더북에 추가됩니다.
   *
   * Match a new limit order against the opposite side of the book.
   * BUY limit: matches against asks where ask price <= limit price (price-time priority).
   * SELL limit: matches against bids where bid price >= limit price.
   * Returns fills if crossing occurs. Unfilled portion goes into the book.
   */
  matchLimitOrder(params: {
    orderId: string;
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    limitPrice: Decimal;
    quantity: Decimal;
  }): { fills: MatchResult[]; remainingQuantity: Decimal } {
    const { orderId, userId, symbol, side, limitPrice, quantity } = params;
    const fills: MatchResult[] = [];
    let remainingQty = quantity;

    const counterBook = side === 'BUY' ? this.asks : this.bids;
    const entries = counterBook.get(symbol) || [];
    const toRemove: string[] = [];

    for (const entry of entries) {
      if (remainingQty.isZero()) break;

      // 교차 조건 확인 / Check crossing condition
      if (side === 'BUY' && entry.price.gt(limitPrice)) break; // 매도호가 오름차순, 더 이상 매칭 없음 / asks sorted asc, no more matches
      if (side === 'SELL' && entry.price.lt(limitPrice)) break; // 매수호가 내림차순, 더 이상 매칭 없음 / bids sorted desc, no more matches

      const matchQty = Decimal.min(remainingQty, entry.remainingQuantity);
      const matchPrice = entry.price; // 가격-시간 우선: 대기 주문의 가격으로 체결 / price-time priority: execute at resting order's price

      const tradeId = generateTradeId();
      fills.push({
        tradeId,
        buyOrderId: side === 'BUY' ? orderId : entry.orderId,
        sellOrderId: side === 'SELL' ? orderId : entry.orderId,
        buyerId: side === 'BUY' ? userId : entry.userId,
        sellerId: side === 'SELL' ? userId : entry.userId,
        symbol,
        matchedQuantity: matchQty.toString(),
        matchedPrice: matchPrice.toString(),
      });

      entry.remainingQuantity = entry.remainingQuantity.minus(matchQty);
      remainingQty = remainingQty.minus(matchQty);

      if (entry.remainingQuantity.isZero()) {
        toRemove.push(entry.orderId);
      }
    }

    // 전량 체결된 대기 주문 제거 / Remove fully filled resting orders
    if (toRemove.length > 0) {
      counterBook.set(
        symbol,
        entries.filter((e) => !toRemove.includes(e.orderId)),
      );
    }

    if (fills.length > 0) {
      this.logger.log(
        `Limit ${side} order ${orderId} crossed book: ${fills.length} fills for ${symbol}`,
      );
    }

    return { fills, remainingQuantity: remainingQty };
  }

  /**
   * 대기 중인 지정가 주문의 가격 및/또는 수량을 수정합니다.
   * 기존 항목을 제거하고 새 파라미터로 재삽입합니다 (시간 우선순위 상실).
   *
   * Update a resting limit order's price and/or quantity.
   * Removes the old entry and re-inserts with new parameters (loses time priority).
   */
  modifyOrderInBook(params: {
    orderId: string;
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    newPrice: Decimal;
    newQuantity: Decimal;
  }): void {
    this.removeFromOrderBook(params.orderId, params.symbol, params.side);
    this.addToOrderBook({
      orderId: params.orderId,
      userId: params.userId,
      symbol: params.symbol,
      side: params.side,
      price: params.newPrice,
      remainingQuantity: params.newQuantity,
      timestamp: Date.now(), // 새 타임스탬프 = 우선순위 상실 / new timestamp = loses priority
    });
    this.logger.log(
      `Modified order ${params.orderId} in book: price=${params.newPrice}, qty=${params.newQuantity}`,
    );
  }

  getOrderBookDepth(symbol: string): { bids: { price: string; quantity: string }[]; asks: { price: string; quantity: string }[] } {
    const bidEntries = this.bids.get(symbol) || [];
    const askEntries = this.asks.get(symbol) || [];

    return {
      bids: bidEntries.map((e) => ({
        price: e.price.toString(),
        quantity: e.remainingQuantity.toString(),
      })),
      asks: askEntries.map((e) => ({
        price: e.price.toString(),
        quantity: e.remainingQuantity.toString(),
      })),
    };
  }
}
