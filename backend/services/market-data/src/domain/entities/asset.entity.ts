import { AssetType } from '@mock-exchange/common';

export interface PriceTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

export interface AssetConfig {
  symbol: string;
  name: string;
  assetType: AssetType;
  basePrice: number;
  volatility: number; // annual volatility (e.g., 0.6 for 60%)
  spreadBps: number; // bid-ask spread in basis points
}

export const DEFAULT_ASSETS: AssetConfig[] = [
  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin', assetType: 'CRYPTO', basePrice: 42000, volatility: 0.65, spreadBps: 10 },
  { symbol: 'ETH-USD', name: 'Ethereum', assetType: 'CRYPTO', basePrice: 2500, volatility: 0.75, spreadBps: 15 },
  { symbol: 'SOL-USD', name: 'Solana', assetType: 'CRYPTO', basePrice: 95, volatility: 0.85, spreadBps: 20 },
  { symbol: 'XRP-USD', name: 'Ripple', assetType: 'CRYPTO', basePrice: 0.55, volatility: 0.80, spreadBps: 25 },
  { symbol: 'DOGE-USD', name: 'Dogecoin', assetType: 'CRYPTO', basePrice: 0.08, volatility: 0.90, spreadBps: 30 },
  { symbol: 'ADA-USD', name: 'Cardano', assetType: 'CRYPTO', basePrice: 0.45, volatility: 0.82, spreadBps: 25 },
  { symbol: 'DOT-USD', name: 'Polkadot', assetType: 'CRYPTO', basePrice: 7.2, volatility: 0.78, spreadBps: 22 },
  { symbol: 'AVAX-USD', name: 'Avalanche', assetType: 'CRYPTO', basePrice: 35, volatility: 0.88, spreadBps: 20 },
  { symbol: 'LINK-USD', name: 'Chainlink', assetType: 'CRYPTO', basePrice: 14, volatility: 0.75, spreadBps: 18 },
  { symbol: 'MATIC-USD', name: 'Polygon', assetType: 'CRYPTO', basePrice: 0.85, volatility: 0.80, spreadBps: 22 },
  // Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', basePrice: 185, volatility: 0.25, spreadBps: 5 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', assetType: 'STOCK', basePrice: 140, volatility: 0.28, spreadBps: 5 },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetType: 'STOCK', basePrice: 250, volatility: 0.55, spreadBps: 8 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', assetType: 'STOCK', basePrice: 380, volatility: 0.22, spreadBps: 5 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', assetType: 'STOCK', basePrice: 720, volatility: 0.50, spreadBps: 8 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', assetType: 'STOCK', basePrice: 155, volatility: 0.30, spreadBps: 5 },
  { symbol: 'META', name: 'Meta Platforms Inc.', assetType: 'STOCK', basePrice: 380, volatility: 0.38, spreadBps: 6 },
  { symbol: 'NFLX', name: 'Netflix Inc.', assetType: 'STOCK', basePrice: 480, volatility: 0.40, spreadBps: 7 },
  { symbol: 'AMD', name: 'AMD Inc.', assetType: 'STOCK', basePrice: 145, volatility: 0.48, spreadBps: 7 },
  { symbol: 'INTC', name: 'Intel Corp.', assetType: 'STOCK', basePrice: 44, volatility: 0.35, spreadBps: 6 },
];
