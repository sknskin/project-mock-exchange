export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    expiresIn: number;
  };
}

export interface RegisterResponse {
  success: boolean;
  data: User;
}

export interface AssetInfo {
  symbol: string;
  name: string;
  assetType: 'CRYPTO' | 'STOCK';
  basePrice: string;
  isActive: boolean;
}

export interface Asset {
  symbol: string;
  name?: string;
  type?: 'CRYPTO' | 'STOCK';
  // From prices endpoint
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;
  // Merged from assets list
  currentPrice: number;
  changePercent: number;
  changeAmount: number;
}

export interface Candlestick {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  spread?: number;
}

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
  quantity: number;
  price: number | null;
  filledQuantity: number;
  filledPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
}

export interface Portfolio {
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  holdings: Holding[];
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalValue: number;
  pnlPercent: number;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: string;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  changePercent: number;
  changeAmount: number;
  volume: number;
  timestamp: number;
}
