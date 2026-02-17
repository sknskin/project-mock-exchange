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
