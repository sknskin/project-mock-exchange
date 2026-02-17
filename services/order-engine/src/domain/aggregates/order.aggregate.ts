import { AggregateRoot } from '@mock-exchange/event-store';
import { ORDER_EVENT_TYPES } from '@mock-exchange/common';
import Decimal from 'decimal.js';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'PENDING' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export class OrderAggregate extends AggregateRoot {
  private _orderId: string;
  private _userId: string;
  private _symbol: string;
  private _side: OrderSide;
  private _type: OrderType;
  private _price: Decimal | null;
  private _quantity: Decimal;
  private _filledQuantity: Decimal;
  private _remainingQuantity: Decimal;
  private _status: OrderStatus;
  private _idempotencyKey: string;

  get orderId() { return this._orderId; }
  get idempotencyKey() { return this._idempotencyKey; }
  get userId() { return this._userId; }
  get symbol() { return this._symbol; }
  get side() { return this._side; }
  get type() { return this._type; }
  get price() { return this._price; }
  get quantity() { return this._quantity; }
  get filledQuantity() { return this._filledQuantity; }
  get remainingQuantity() { return this._remainingQuantity; }
  get status() { return this._status; }

  static streamId(orderId: string): string {
    return `order-${orderId}`;
  }

  static place(params: {
    orderId: string;
    userId: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    price: string | null;
    quantity: string;
    idempotencyKey: string;
  }): OrderAggregate {
    const order = new OrderAggregate();
    order.raise(ORDER_EVENT_TYPES.ORDER_PLACED, {
      orderId: params.orderId,
      userId: params.userId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      price: params.price,
      quantity: params.quantity,
      idempotencyKey: params.idempotencyKey,
    });
    return order;
  }

  match(matchedQuantity: string, matchedPrice: string, tradeId: string, counterpartyOrderId: string): void {
    if (this._status !== 'PENDING' && this._status !== 'PARTIAL') {
      throw new Error(`Cannot match order in status ${this._status}`);
    }

    const matchQty = new Decimal(matchedQuantity);
    if (matchQty.gt(this._remainingQuantity)) {
      throw new Error('Matched quantity exceeds remaining');
    }

    this.raise(ORDER_EVENT_TYPES.ORDER_MATCHED, {
      orderId: this._orderId,
      tradeId,
      matchedQuantity,
      matchedPrice,
      remainingQuantity: this._remainingQuantity.minus(matchQty).toString(),
      counterpartyOrderId,
    });

    // If fully filled
    if (this._remainingQuantity.isZero()) {
      this.raise(ORDER_EVENT_TYPES.ORDER_FILLED, {
        orderId: this._orderId,
        totalFilledQuantity: this._filledQuantity.toString(),
        averagePrice: matchedPrice, // simplified; real impl would track weighted avg
        status: 'FILLED',
      });
    }
  }

  modify(newPrice: string, newQuantity: string): void {
    if (this._status !== 'PENDING' && this._status !== 'PARTIAL') {
      throw new Error(`Cannot modify order in status ${this._status}`);
    }
    if (this._type !== 'LIMIT') {
      throw new Error('Only limit orders can be modified');
    }

    this.raise(ORDER_EVENT_TYPES.ORDER_MODIFIED, {
      orderId: this._orderId,
      userId: this._userId,
      previousPrice: this._price?.toString() || null,
      newPrice,
      previousQuantity: this._remainingQuantity.toString(),
      newQuantity,
    });
  }

  cancel(reason: string): void {
    if (this._status === 'FILLED' || this._status === 'CANCELLED') {
      throw new Error(`Cannot cancel order in status ${this._status}`);
    }

    this.raise(ORDER_EVENT_TYPES.ORDER_CANCELLED, {
      orderId: this._orderId,
      userId: this._userId,
      reason,
      unfilledQuantity: this._remainingQuantity.toString(),
    });
  }

  // Event handlers (convention: on{EventShortName})
  protected onPlaced(data: Record<string, unknown>): void {
    this._orderId = data.orderId as string;
    this._userId = data.userId as string;
    this._symbol = data.symbol as string;
    this._side = data.side as OrderSide;
    this._type = data.type as OrderType;
    this._price = data.price ? new Decimal(data.price as string) : null;
    this._quantity = new Decimal(data.quantity as string);
    this._filledQuantity = new Decimal(0);
    this._remainingQuantity = new Decimal(data.quantity as string);
    this._status = 'PENDING';
    this._idempotencyKey = data.idempotencyKey as string;
  }

  protected onMatched(data: Record<string, unknown>): void {
    const matchedQty = new Decimal(data.matchedQuantity as string);
    this._filledQuantity = this._filledQuantity.plus(matchedQty);
    this._remainingQuantity = new Decimal(data.remainingQuantity as string);
    this._status = this._remainingQuantity.isZero() ? 'FILLED' : 'PARTIAL';
  }

  protected onFilled(_data: Record<string, unknown>): void {
    this._status = 'FILLED';
  }

  protected onModified(data: Record<string, unknown>): void {
    this._price = new Decimal(data.newPrice as string);
    this._remainingQuantity = new Decimal(data.newQuantity as string);
    this._quantity = this._filledQuantity.plus(this._remainingQuantity);
  }

  protected onCancelled(_data: Record<string, unknown>): void {
    this._status = 'CANCELLED';
  }

  protected onRejected(_data: Record<string, unknown>): void {
    this._status = 'REJECTED';
  }
}
