import { OrderSide, OrderStatus, OrderType } from '../constants';

export interface PlaceOrderDto {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: string;
  quantity: string;
  idempotencyKey: string;
}

export interface OrderResponseDto {
  orderId: string;
  status: OrderStatus;
  message: string;
}

export interface OrderReadDto {
  orderId: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: string | null;
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
