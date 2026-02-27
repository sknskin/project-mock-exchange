import { MatchingEngineService, OrderBookEntry } from './matching-engine.service';
import Decimal from 'decimal.js';

describe('MatchingEngineService', () => {
  let engine: MatchingEngineService;

  beforeEach(() => {
    engine = new MatchingEngineService();
  });

  // ─── 오더북 관리 ─────────────────────────────────

  describe('addToOrderBook', () => {
    it('should add BUY entry and sort by price desc', () => {
      engine.addToOrderBook(mockEntry('o1', 'BUY', '100', '1'));
      engine.addToOrderBook(mockEntry('o2', 'BUY', '102', '1'));
      engine.addToOrderBook(mockEntry('o3', 'BUY', '101', '1'));

      const depth = engine.getOrderBookDepth('BTC');
      expect(depth.bids).toHaveLength(3);
      expect(depth.bids[0].price).toBe('102');
      expect(depth.bids[1].price).toBe('101');
      expect(depth.bids[2].price).toBe('100');
    });

    it('should add SELL entry and sort by price asc', () => {
      engine.addToOrderBook(mockEntry('o1', 'SELL', '103', '1'));
      engine.addToOrderBook(mockEntry('o2', 'SELL', '101', '1'));
      engine.addToOrderBook(mockEntry('o3', 'SELL', '102', '1'));

      const depth = engine.getOrderBookDepth('BTC');
      expect(depth.asks).toHaveLength(3);
      expect(depth.asks[0].price).toBe('101');
      expect(depth.asks[1].price).toBe('102');
      expect(depth.asks[2].price).toBe('103');
    });

    it('should sort by timestamp (FIFO) when price is equal', () => {
      engine.addToOrderBook(mockEntry('o1', 'BUY', '100', '1', 2000));
      engine.addToOrderBook(mockEntry('o2', 'BUY', '100', '1', 1000));

      const depth = engine.getOrderBookDepth('BTC');
      // o2 has earlier timestamp, should be first
      expect(depth.bids[0].quantity).toBe('1'); // both same qty
    });
  });

  describe('removeFromOrderBook', () => {
    it('should remove specific order from bids', () => {
      engine.addToOrderBook(mockEntry('o1', 'BUY', '100', '1'));
      engine.addToOrderBook(mockEntry('o2', 'BUY', '101', '2'));

      engine.removeFromOrderBook('o1', 'BTC', 'BUY');

      const depth = engine.getOrderBookDepth('BTC');
      expect(depth.bids).toHaveLength(1);
      expect(depth.bids[0].price).toBe('101');
    });

    it('should remove specific order from asks', () => {
      engine.addToOrderBook(mockEntry('o1', 'SELL', '100', '1'));
      engine.addToOrderBook(mockEntry('o2', 'SELL', '101', '2'));

      engine.removeFromOrderBook('o2', 'BTC', 'SELL');

      const depth = engine.getOrderBookDepth('BTC');
      expect(depth.asks).toHaveLength(1);
      expect(depth.asks[0].price).toBe('100');
    });

    it('should not throw when removing non-existent order', () => {
      expect(() => engine.removeFromOrderBook('none', 'BTC', 'BUY')).not.toThrow();
    });
  });

  // ─── 시장가 주문 매칭 ────────────────────────────

  describe('matchMarketOrder', () => {
    it('should match BUY against asks at ask price', () => {
      engine.addToOrderBook(mockEntry('sell1', 'SELL', '100', '5'));

      const fills = engine.matchMarketOrder({
        orderId: 'buy1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', quantity: new Decimal('3'), marketPrice: new Decimal('100'),
      });

      expect(fills).toHaveLength(1);
      expect(fills[0].matchedQuantity).toBe('3');
      expect(fills[0].matchedPrice).toBe('100');
      expect(fills[0].buyOrderId).toBe('buy1');
      expect(fills[0].sellOrderId).toBe('sell1');
    });

    it('should match SELL against bids at bid price', () => {
      engine.addToOrderBook(mockEntry('buy1', 'BUY', '50', '10'));

      const fills = engine.matchMarketOrder({
        orderId: 'sell1', userId: 'u2', symbol: 'BTC',
        side: 'SELL', quantity: new Decimal('4'), marketPrice: new Decimal('50'),
      });

      expect(fills).toHaveLength(1);
      expect(fills[0].matchedQuantity).toBe('4');
      expect(fills[0].sellOrderId).toBe('sell1');
      expect(fills[0].buyOrderId).toBe('buy1');
    });

    it('should fill across multiple orders (price-time priority)', () => {
      engine.addToOrderBook(mockEntry('s1', 'SELL', '100', '2'));
      engine.addToOrderBook(mockEntry('s2', 'SELL', '101', '3'));

      const fills = engine.matchMarketOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', quantity: new Decimal('4'), marketPrice: new Decimal('105'),
      });

      expect(fills).toHaveLength(2);
      expect(fills[0].matchedQuantity).toBe('2');
      expect(fills[0].matchedPrice).toBe('100'); // cheaper ask first
      expect(fills[1].matchedQuantity).toBe('2');
      expect(fills[1].matchedPrice).toBe('101');
    });

    it('should use MARKET_MAKER when no counter orders exist', () => {
      const fills = engine.matchMarketOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', quantity: new Decimal('10'), marketPrice: new Decimal('50000'),
      });

      expect(fills).toHaveLength(1);
      expect(fills[0].buyerId).toBe('u1');
      expect(fills[0].sellerId).toBe('MARKET_MAKER');
      expect(fills[0].matchedPrice).toBe('50000');
    });

    it('should partially fill from book and rest from MARKET_MAKER', () => {
      engine.addToOrderBook(mockEntry('s1', 'SELL', '100', '3'));

      const fills = engine.matchMarketOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', quantity: new Decimal('5'), marketPrice: new Decimal('100'),
      });

      expect(fills).toHaveLength(2);
      expect(fills[0].matchedQuantity).toBe('3');
      expect(fills[0].sellOrderId).toBe('s1');
      expect(fills[1].matchedQuantity).toBe('2');
      expect(fills[1].sellerId).toBe('MARKET_MAKER');
    });

    it('should remove fully filled entries from book', () => {
      engine.addToOrderBook(mockEntry('s1', 'SELL', '100', '5'));

      engine.matchMarketOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', quantity: new Decimal('5'), marketPrice: new Decimal('100'),
      });

      const depth = engine.getOrderBookDepth('BTC');
      expect(depth.asks).toHaveLength(0);
    });

    it('should keep partially filled entries in book', () => {
      engine.addToOrderBook(mockEntry('s1', 'SELL', '100', '10'));

      engine.matchMarketOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', quantity: new Decimal('3'), marketPrice: new Decimal('100'),
      });

      const depth = engine.getOrderBookDepth('BTC');
      expect(depth.asks).toHaveLength(1);
      expect(depth.asks[0].quantity).toBe('7');
    });
  });

  // ─── 지정가 주문 매칭 ────────────────────────────

  describe('matchLimitOrder', () => {
    it('should cross BUY limit against asks below limit price', () => {
      engine.addToOrderBook(mockEntry('s1', 'SELL', '99', '3'));
      engine.addToOrderBook(mockEntry('s2', 'SELL', '100', '2'));

      const result = engine.matchLimitOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', limitPrice: new Decimal('100'), quantity: new Decimal('4'),
      });

      expect(result.fills).toHaveLength(2);
      expect(result.fills[0].matchedPrice).toBe('99');
      expect(result.fills[0].matchedQuantity).toBe('3');
      expect(result.fills[1].matchedPrice).toBe('100');
      expect(result.fills[1].matchedQuantity).toBe('1');
      expect(result.remainingQuantity.toString()).toBe('0');
    });

    it('should cross SELL limit against bids above limit price', () => {
      engine.addToOrderBook(mockEntry('b1', 'BUY', '102', '2'));
      engine.addToOrderBook(mockEntry('b2', 'BUY', '101', '3'));

      const result = engine.matchLimitOrder({
        orderId: 's1', userId: 'u2', symbol: 'BTC',
        side: 'SELL', limitPrice: new Decimal('101'), quantity: new Decimal('4'),
      });

      expect(result.fills).toHaveLength(2);
      expect(result.fills[0].matchedPrice).toBe('102'); // highest bid first
      expect(result.fills[1].matchedPrice).toBe('101');
      expect(result.remainingQuantity.toString()).toBe('0');
    });

    it('should not cross when no matching price', () => {
      engine.addToOrderBook(mockEntry('s1', 'SELL', '105', '5'));

      const result = engine.matchLimitOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', limitPrice: new Decimal('100'), quantity: new Decimal('3'),
      });

      expect(result.fills).toHaveLength(0);
      expect(result.remainingQuantity.toString()).toBe('3');
    });

    it('should return remaining quantity when book is thin', () => {
      engine.addToOrderBook(mockEntry('s1', 'SELL', '99', '2'));

      const result = engine.matchLimitOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', limitPrice: new Decimal('100'), quantity: new Decimal('5'),
      });

      expect(result.fills).toHaveLength(1);
      expect(result.fills[0].matchedQuantity).toBe('2');
      expect(result.remainingQuantity.toString()).toBe('3');
    });

    it('should execute at resting order price (price-time priority)', () => {
      engine.addToOrderBook(mockEntry('s1', 'SELL', '95', '1'));

      const result = engine.matchLimitOrder({
        orderId: 'b1', userId: 'u1', symbol: 'BTC',
        side: 'BUY', limitPrice: new Decimal('100'), quantity: new Decimal('1'),
      });

      // Should execute at 95 (resting order's price), not 100 (incoming limit)
      expect(result.fills[0].matchedPrice).toBe('95');
    });
  });

  // ─── 주문 수정 ───────────────────────────────────

  describe('modifyOrderInBook', () => {
    it('should update price and quantity', () => {
      engine.addToOrderBook(mockEntry('o1', 'BUY', '100', '5'));

      engine.modifyOrderInBook({
        orderId: 'o1', userId: 'u1', symbol: 'BTC', side: 'BUY',
        newPrice: new Decimal('105'), newQuantity: new Decimal('3'),
      });

      const depth = engine.getOrderBookDepth('BTC');
      expect(depth.bids).toHaveLength(1);
      expect(depth.bids[0].price).toBe('105');
      expect(depth.bids[0].quantity).toBe('3');
    });
  });

  // ─── 오더북 깊이 조회 ────────────────────────────

  describe('getOrderBookDepth', () => {
    it('should return empty arrays for unknown symbol', () => {
      const depth = engine.getOrderBookDepth('UNKNOWN');
      expect(depth.bids).toEqual([]);
      expect(depth.asks).toEqual([]);
    });

    it('should return all entries with string values', () => {
      engine.addToOrderBook(mockEntry('b1', 'BUY', '100', '5'));
      engine.addToOrderBook(mockEntry('s1', 'SELL', '101', '3'));

      const depth = engine.getOrderBookDepth('BTC');
      expect(depth.bids[0]).toEqual({ price: '100', quantity: '5' });
      expect(depth.asks[0]).toEqual({ price: '101', quantity: '3' });
    });
  });
});

// ─── 헬퍼 ──────────────────────────────────────────

function mockEntry(
  orderId: string,
  side: 'BUY' | 'SELL',
  price: string,
  qty: string,
  timestamp = Date.now(),
): OrderBookEntry {
  return {
    orderId,
    userId: `user-${orderId}`,
    symbol: 'BTC',
    side,
    price: new Decimal(price),
    remainingQuantity: new Decimal(qty),
    timestamp,
  };
}
