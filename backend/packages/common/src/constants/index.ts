/**
 * @file 공통 상수
 * @description 서비스 이름, Kafka 토픽 등 마이크로서비스 공통 상수
 *
 * @file Common Constants
 * @description Shared constants: service names, Kafka topics, etc.
 */
// Kafka Topics
export const KAFKA_TOPICS = {
  MARKET_PRICES_UPDATED: 'market.prices.updated',
  ORDERS_COMMANDS: 'orders.commands',
  ORDERS_EVENTS: 'orders.events',
  TRADES_EXECUTED: 'trades.executed',
  PORTFOLIO_EVENTS: 'portfolio.events',
  NOTIFICATIONS_COMMANDS: 'notifications.commands',
  CHAT_MESSAGES: 'chat.messages',
  AI_JOBS: 'ai.jobs',
  AI_RESULTS: 'ai.results',
} as const;

// Dead Letter Queue Topics
export const DLQ_TOPICS = {
  ORDERS_EVENTS: 'dlq.orders.events',
  PORTFOLIO_EVENTS: 'dlq.portfolio.events',
  NOTIFICATIONS_COMMANDS: 'dlq.notifications.commands',
  CHAT_MESSAGES: 'dlq.chat.messages',
} as const;

// Order
export const ORDER_SIDE = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export type OrderSide = (typeof ORDER_SIDE)[keyof typeof ORDER_SIDE];

export const ORDER_TYPE = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
} as const;

export type OrderType = (typeof ORDER_TYPE)[keyof typeof ORDER_TYPE];

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Roles
export const USER_ROLE = {
  SYSTEM: 'SYSTEM',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// Transaction Types
export const TRANSACTION_TYPE = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  BUY: 'BUY',
  SELL: 'SELL',
  RESERVE: 'RESERVE',
  RELEASE: 'RELEASE',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

// Asset Types
export const ASSET_TYPE = {
  STOCK: 'STOCK',
  CRYPTO: 'CRYPTO',
} as const;

export type AssetType = (typeof ASSET_TYPE)[keyof typeof ASSET_TYPE];

// Service Names (for CloudEvent source)
export const SERVICE_NAME = {
  API_GATEWAY: 'mock-exchange/api-gateway',
  USER_AUTH: 'mock-exchange/user-auth',
  MARKET_DATA: 'mock-exchange/market-data',
  ORDER_ENGINE: 'mock-exchange/order-engine',
  PORTFOLIO: 'mock-exchange/portfolio',
  NOTIFICATION: 'mock-exchange/notification',
  CHAT: 'mock-exchange/chat',
  AI_SERVICE: 'mock-exchange/ai-service',
} as const;
