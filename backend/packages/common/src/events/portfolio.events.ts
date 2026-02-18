/**
 * @file 포트폴리오 이벤트
 * @description 자금 예약, 정산 등 포트폴리오 관련 도메인 이벤트 정의
 *
 * @file Portfolio Events
 * @description Portfolio domain events: fund reservation, settlement, etc.
 */
export const PORTFOLIO_EVENT_TYPES = {
  FUNDS_RESERVED: 'com.mockexchange.portfolio.funds_reserved',
  FUNDS_RELEASED: 'com.mockexchange.portfolio.funds_released',
  FUNDS_SETTLED: 'com.mockexchange.portfolio.funds_settled',
  FUNDS_DEPOSITED: 'com.mockexchange.portfolio.funds_deposited',
  FUNDS_WITHDRAWN: 'com.mockexchange.portfolio.funds_withdrawn',
  RESERVE_FAILED: 'com.mockexchange.portfolio.reserve_failed',
  HOLDINGS_UPDATED: 'com.mockexchange.portfolio.holdings_updated',
  BALANCE_UPDATED: 'com.mockexchange.portfolio.balance_updated',
} as const;

export interface FundsReservedData {
  userId: string;
  orderId: string;
  amount: string;
  reservationId: string;
}

export interface FundsReleasedData {
  userId: string;
  orderId: string;
  amount: string;
  reservationId: string;
}

export interface FundsSettledData {
  userId: string;
  tradeId: string;
  orderId: string;
  cashDelta: string;
  symbol: string;
  quantityDelta: string;
}

export interface ReserveFailedData {
  userId: string;
  orderId: string;
  requestedAmount: string;
  availableBalance: string;
  reason: string;
}
