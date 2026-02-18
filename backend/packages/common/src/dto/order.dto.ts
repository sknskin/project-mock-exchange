/**
 * @file 주문 공통 DTO
 * @description 마이크로서비스 간 주문 관련 공유 Data Transfer Object
 *
 * @file Order Common DTO
 * @description Shared order-related Data Transfer Objects across services
 */
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
