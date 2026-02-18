/**
 * @file 포트폴리오 공통 DTO
 * @description 마이크로서비스 간 포트폴리오 관련 공유 Data Transfer Object
 *
 * @file Portfolio Common DTO
 * @description Shared portfolio-related Data Transfer Objects across services
 */
export interface BalanceDto {
  userId: string;
  availableCash: string;
  reservedCash: string;
  totalCash: string;
}

export interface HoldingDto {
  symbol: string;
  quantity: string;
  avgCostBasis: string;
  totalCost: string;
  currentPrice?: string;
  marketValue?: string;
  unrealizedPnl?: string;
  unrealizedPnlPercent?: string;
}

export interface PortfolioSummaryDto {
  userId: string;
  balance: BalanceDto;
  holdings: HoldingDto[];
  totalPortfolioValue: string;
  totalUnrealizedPnl: string;
}
