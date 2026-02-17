import { OrderSide, OrderStatus, OrderType } from '../constants';

export const ORDER_EVENT_TYPES = {
  ORDER_PLACED: 'com.mockexchange.order.placed',
  ORDER_MATCHED: 'com.mockexchange.order.matched',
  ORDER_PARTIALLY_FILLED: 'com.mockexchange.order.partially_filled',
  ORDER_FILLED: 'com.mockexchange.order.filled',
  ORDER_CANCELLED: 'com.mockexchange.order.cancelled',
  ORDER_REJECTED: 'com.mockexchange.order.rejected',
  ORDER_EXPIRED: 'com.mockexchange.order.expired',
} as const;

export interface OrderPlacedData {
  orderId: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: string | null;
  quantity: string;
  idempotencyKey: string;
}

export interface OrderMatchedData {
  orderId: string;
  tradeId: string;
  matchedQuantity: string;
  matchedPrice: string;
  remainingQuantity: string;
  counterpartyOrderId: string;
}

export interface OrderFilledData {
  orderId: string;
  totalFilledQuantity: string;
  averagePrice: string;
  status: OrderStatus;
}

export interface OrderCancelledData {
  orderId: string;
  userId: string;
  reason: string;
  unfilledQuantity: string;
}

export interface OrderRejectedData {
  orderId: string;
  userId: string;
  reason: string;
  idempotencyKey: string;
}
