import { OrderAggregate } from './order.aggregate';
import { ORDER_EVENT_TYPES } from '@virtuex/common';

function placeOrder(overrides: Partial<Parameters<typeof OrderAggregate.place>[0]> = {}) {
  return OrderAggregate.place({
    orderId: 'order-1',
    userId: 'user-1',
    symbol: 'BTC-USD',
    side: 'BUY',
    type: 'LIMIT',
    price: '50000',
    quantity: '10',
    idempotencyKey: 'key-1',
    ...overrides,
  });
}

describe('OrderAggregate', () => {
  describe('place', () => {
    it('should create an order with PENDING status', () => {
      const order = placeOrder();

      expect(order.orderId).toBe('order-1');
      expect(order.userId).toBe('user-1');
      expect(order.symbol).toBe('BTC-USD');
      expect(order.side).toBe('BUY');
      expect(order.type).toBe('LIMIT');
      expect(order.price?.toString()).toBe('50000');
      expect(order.quantity.toString()).toBe('10');
      expect(order.filledQuantity.toString()).toBe('0');
      expect(order.remainingQuantity.toString()).toBe('10');
      expect(order.status).toBe('PENDING');
    });

    it('should emit ORDER_PLACED event', () => {
      const order = placeOrder();
      const events = order.uncommittedEvents;

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(ORDER_EVENT_TYPES.ORDER_PLACED);
      expect(events[0].eventData).toMatchObject({
        orderId: 'order-1',
        symbol: 'BTC-USD',
        side: 'BUY',
        quantity: '10',
      });
    });

    it('should handle MARKET order with null price', () => {
      const order = placeOrder({ type: 'MARKET', price: null });

      expect(order.type).toBe('MARKET');
      expect(order.price).toBeNull();
    });
  });

  describe('match', () => {
    it('should partially fill an order', () => {
      const order = placeOrder();
      order.clearUncommittedEvents();

      order.match('3', '50000', 'trade-1', 'counter-1');

      expect(order.filledQuantity.toString()).toBe('3');
      expect(order.remainingQuantity.toString()).toBe('7');
      expect(order.status).toBe('PARTIAL');
    });

    it('should fully fill an order and emit FILLED event', () => {
      const order = placeOrder();
      order.clearUncommittedEvents();

      order.match('10', '50000', 'trade-1', 'counter-1');

      expect(order.filledQuantity.toString()).toBe('10');
      expect(order.remainingQuantity.toString()).toBe('0');
      expect(order.status).toBe('FILLED');

      const events = order.uncommittedEvents;
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe(ORDER_EVENT_TYPES.ORDER_MATCHED);
      expect(events[1].eventType).toBe(ORDER_EVENT_TYPES.ORDER_FILLED);
    });

    it('should handle multiple partial fills', () => {
      const order = placeOrder();
      order.clearUncommittedEvents();

      order.match('3', '50000', 'trade-1', 'counter-1');
      order.match('4', '50100', 'trade-2', 'counter-2');

      expect(order.filledQuantity.toString()).toBe('7');
      expect(order.remainingQuantity.toString()).toBe('3');
      expect(order.status).toBe('PARTIAL');
    });

    it('should throw when matched quantity exceeds remaining', () => {
      const order = placeOrder();

      expect(() => order.match('11', '50000', 'trade-1', 'counter-1')).toThrow(
        'Matched quantity exceeds remaining',
      );
    });

    it('should throw when matching a CANCELLED order', () => {
      const order = placeOrder();
      order.cancel('user request');

      expect(() => order.match('1', '50000', 'trade-1', 'counter-1')).toThrow(
        'Cannot match order in status CANCELLED',
      );
    });

    it('should throw when matching a FILLED order', () => {
      const order = placeOrder();
      order.match('10', '50000', 'trade-1', 'counter-1');

      expect(() => order.match('1', '50000', 'trade-2', 'counter-2')).toThrow(
        'Cannot match order in status FILLED',
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a PENDING order', () => {
      const order = placeOrder();
      order.clearUncommittedEvents();

      order.cancel('user request');

      expect(order.status).toBe('CANCELLED');
      const events = order.uncommittedEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(ORDER_EVENT_TYPES.ORDER_CANCELLED);
      expect(events[0].eventData).toMatchObject({
        orderId: 'order-1',
        reason: 'user request',
        unfilledQuantity: '10',
      });
    });

    it('should cancel a PARTIAL order', () => {
      const order = placeOrder();
      order.match('3', '50000', 'trade-1', 'counter-1');
      order.clearUncommittedEvents();

      order.cancel('user request');

      expect(order.status).toBe('CANCELLED');
      expect(order.uncommittedEvents[0].eventData.unfilledQuantity).toBe('7');
    });

    it('should throw when cancelling a FILLED order', () => {
      const order = placeOrder();
      order.match('10', '50000', 'trade-1', 'counter-1');

      expect(() => order.cancel('user request')).toThrow(
        'Cannot cancel order in status FILLED',
      );
    });

    it('should throw when cancelling an already CANCELLED order', () => {
      const order = placeOrder();
      order.cancel('first cancel');

      expect(() => order.cancel('second cancel')).toThrow(
        'Cannot cancel order in status CANCELLED',
      );
    });
  });

  describe('modify', () => {
    it('should modify price and quantity of a LIMIT order', () => {
      const order = placeOrder();
      order.clearUncommittedEvents();

      order.modify('55000', '8');

      expect(order.price?.toString()).toBe('55000');
      expect(order.remainingQuantity.toString()).toBe('8');

      const events = order.uncommittedEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(ORDER_EVENT_TYPES.ORDER_MODIFIED);
      expect(events[0].eventData).toMatchObject({
        previousPrice: '50000',
        newPrice: '55000',
        previousQuantity: '10',
        newQuantity: '8',
      });
    });

    it('should throw when modifying a MARKET order', () => {
      const order = placeOrder({ type: 'MARKET', price: null });

      expect(() => order.modify('50000', '5')).toThrow(
        'Only limit orders can be modified',
      );
    });

    it('should throw when modifying a FILLED order', () => {
      const order = placeOrder();
      order.match('10', '50000', 'trade-1', 'counter-1');

      expect(() => order.modify('55000', '5')).toThrow(
        'Cannot modify order in status FILLED',
      );
    });

    it('should throw when modifying a CANCELLED order', () => {
      const order = placeOrder();
      order.cancel('test');

      expect(() => order.modify('55000', '5')).toThrow(
        'Cannot modify order in status CANCELLED',
      );
    });
  });

  describe('streamId', () => {
    it('should return correct stream ID', () => {
      expect(OrderAggregate.streamId('abc-123')).toBe('order-abc-123');
    });
  });

  describe('trigger orders (STOP_LOSS / TAKE_PROFIT)', () => {
    it('should create STOP_LOSS order with triggerPrice and triggerType', () => {
      const order = placeOrder({
        triggerPrice: '45000',
        triggerType: 'STOP_LOSS',
      });

      expect(order.triggerPrice?.toString()).toBe('45000');
      expect(order.triggerType).toBe('STOP_LOSS');
      expect(order.triggered).toBe(false);
    });

    it('should create TAKE_PROFIT order with triggerPrice and triggerType', () => {
      const order = placeOrder({
        triggerPrice: '60000',
        triggerType: 'TAKE_PROFIT',
      });

      expect(order.triggerPrice?.toString()).toBe('60000');
      expect(order.triggerType).toBe('TAKE_PROFIT');
      expect(order.triggered).toBe(false);
    });

    it('should return correct values from triggerPrice and triggerType getters', () => {
      const stopLoss = placeOrder({
        triggerPrice: '42000',
        triggerType: 'STOP_LOSS',
      });

      expect(stopLoss.triggerPrice).not.toBeNull();
      expect(stopLoss.triggerPrice?.toString()).toBe('42000');
      expect(stopLoss.triggerType).toBe('STOP_LOSS');

      const takeProfit = placeOrder({
        orderId: 'order-2',
        triggerPrice: '70000',
        triggerType: 'TAKE_PROFIT',
      });

      expect(takeProfit.triggerPrice).not.toBeNull();
      expect(takeProfit.triggerPrice?.toString()).toBe('70000');
      expect(takeProfit.triggerType).toBe('TAKE_PROFIT');
    });

    it('should have null trigger fields for a normal order', () => {
      const order = placeOrder();

      expect(order.triggerPrice).toBeNull();
      expect(order.triggerType).toBeNull();
      expect(order.triggered).toBe(false);
    });

    it('should include triggerPrice and triggerType in ORDER_PLACED event data', () => {
      const order = placeOrder({
        triggerPrice: '45000',
        triggerType: 'STOP_LOSS',
      });

      const events = order.uncommittedEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(ORDER_EVENT_TYPES.ORDER_PLACED);
      expect(events[0].eventData).toMatchObject({
        triggerPrice: '45000',
        triggerType: 'STOP_LOSS',
      });
    });

    it('should include null trigger fields in ORDER_PLACED event for normal orders', () => {
      const order = placeOrder();

      const events = order.uncommittedEvents;
      expect(events[0].eventData.triggerPrice).toBeNull();
      expect(events[0].eventData.triggerType).toBeNull();
    });

    it('should rebuild trigger fields from event history', () => {
      const original = placeOrder({
        triggerPrice: '45000',
        triggerType: 'STOP_LOSS',
      });

      const events = original.uncommittedEvents.map((e, i) => ({
        id: `${i}`,
        streamId: 'order-order-1',
        streamPosition: i,
        globalPosition: BigInt(i),
        eventType: e.eventType,
        eventData: e.eventData,
        metadata: {},
        createdAt: new Date(),
      }));

      const rebuilt = new (OrderAggregate as any)();
      rebuilt.loadFromHistory(events);

      expect(rebuilt.triggerPrice?.toString()).toBe('45000');
      expect(rebuilt.triggerType).toBe('STOP_LOSS');
      expect(rebuilt.triggered).toBe(false);
    });
  });

  describe('event sourcing', () => {
    it('should rebuild state from event history', () => {
      const original = placeOrder();
      original.match('3', '50000', 'trade-1', 'counter-1');

      const events = original.uncommittedEvents.map((e, i) => ({
        id: `${i}`,
        streamId: 'order-order-1',
        streamPosition: i,
        globalPosition: BigInt(i),
        eventType: e.eventType,
        eventData: e.eventData,
        metadata: {},
        createdAt: new Date(),
      }));

      const rebuilt = new (OrderAggregate as any)();
      rebuilt.loadFromHistory(events);

      expect(rebuilt.orderId).toBe('order-1');
      expect(rebuilt.status).toBe('PARTIAL');
      expect(rebuilt.filledQuantity.toString()).toBe('3');
      expect(rebuilt.remainingQuantity.toString()).toBe('7');
    });

    it('should track version correctly', () => {
      const order = placeOrder();

      expect(order.version).toBe(0);

      order.match('5', '50000', 'trade-1', 'counter-1');
      expect(order.version).toBe(1);
    });
  });
});
