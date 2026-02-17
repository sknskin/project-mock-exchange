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
