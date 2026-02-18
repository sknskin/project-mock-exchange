/**
 * @file 시장 데이터 이벤트
 * @description 가격 업데이트 등 시장 데이터 관련 도메인 이벤트 정의
 *
 * @file Market Data Events
 * @description Market data domain events: price updates, etc.
 */
export const MARKET_EVENT_TYPES = {
  PRICE_UPDATED: 'com.mockexchange.market.price_updated',
  PRICE_ALERT_TRIGGERED: 'com.mockexchange.market.price_alert_triggered',
} as const;

export interface PriceUpdatedData {
  symbol: string;
  price: string;
  bid: string;
  ask: string;
  volume: string;
  change24h: string;
  changePercent24h: string;
  timestamp: string;
}

export interface PriceAlertTriggeredData {
  alertId: string;
  userId: string;
  symbol: string;
  condition: 'ABOVE' | 'BELOW';
  targetPrice: string;
  currentPrice: string;
  triggeredAt: string;
}
