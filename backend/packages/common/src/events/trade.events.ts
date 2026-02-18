/**
 * @file 체결 이벤트
 * @description 거래 체결 관련 도메인 이벤트 정의
 *
 * @file Trade Events
 * @description Trade execution domain event definitions
 */
export const TRADE_EVENT_TYPES = {
  TRADE_EXECUTED: 'com.mockexchange.trade.executed',
} as const;

export interface TradeExecutedData {
  tradeId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  symbol: string;
  price: string;
  quantity: string;
  total: string;
  executedAt: string;
}
