/**
 * @file 주문 매칭 엔진
 * @description 시장가/지정가 주문을 매칭하는 핵심 매칭 알고리즘
 *
 * @file Order Matching Engine
 * @description Core matching algorithm for market and limit orders
 */
import { Injectable, Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { generateTradeId } from '@mock-exchange/common';

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

  // In-memory order books: symbol -> { bids (sorted desc), asks (sorted asc) }
  private readonly bids = new Map<string, OrderBookEntry[]>();
  private readonly asks = new Map<string, OrderBookEntry[]>();

  addToOrderBook(entry: OrderBookEntry): void {
    if (entry.side === 'BUY') {
      const book = this.bids.get(entry.symbol) || [];
      book.push(entry);
      // Sort bids: highest price first, then earliest timestamp
      book.sort((a, b) => {
        const priceDiff = b.price.minus(a.price).toNumber();
        return priceDiff !== 0 ? priceDiff : a.timestamp - b.timestamp;
      });
      this.bids.set(entry.symbol, book);
    } else {
      const book = this.asks.get(entry.symbol) || [];
      book.push(entry);
      // Sort asks: lowest price first, then earliest timestamp
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

    // For market orders in Phase 1, we execute at the current market price
    // against the available liquidity. If no limit orders exist,
    // we simulate a fill at market price (as if there's always a market maker).

    const counterBook = side === 'BUY' ? this.asks : this.bids;
    const entries = counterBook.get(symbol) || [];
    let remainingQty = quantity;

    // Try to match against existing limit orders first
    const toRemove: string[] = [];

    for (const entry of entries) {
      if (remainingQty.isZero()) break;

      // For market buys: match against asks at their ask price
      // For market sells: match against bids at their bid price
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

    // Remove fully filled entries
    if (toRemove.length > 0) {
      counterBook.set(
        symbol,
        entries.filter((e) => !toRemove.includes(e.orderId)),
      );
    }

    // If still remaining quantity (no limit orders to match), fill at market price
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

      // Check crossing condition
      if (side === 'BUY' && entry.price.gt(limitPrice)) break; // asks sorted asc, no more matches
      if (side === 'SELL' && entry.price.lt(limitPrice)) break; // bids sorted desc, no more matches

      const matchQty = Decimal.min(remainingQty, entry.remainingQuantity);
      const matchPrice = entry.price; // price-time priority: execute at resting order's price

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

    // Remove fully filled resting orders
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
      timestamp: Date.now(), // new timestamp = loses priority
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
