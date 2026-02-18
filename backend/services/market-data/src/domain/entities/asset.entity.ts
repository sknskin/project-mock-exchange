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
  // ── Crypto (50) ──
  // --- Original 25 ---
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
  { symbol: 'LTC-USD', name: 'Litecoin', assetType: 'CRYPTO', basePrice: 72, volatility: 0.70, spreadBps: 18 },
  { symbol: 'BCH-USD', name: 'Bitcoin Cash', assetType: 'CRYPTO', basePrice: 240, volatility: 0.68, spreadBps: 16 },
  { symbol: 'UNI-USD', name: 'Uniswap', assetType: 'CRYPTO', basePrice: 6.5, volatility: 0.85, spreadBps: 25 },
  { symbol: 'ATOM-USD', name: 'Cosmos', assetType: 'CRYPTO', basePrice: 9.8, volatility: 0.78, spreadBps: 22 },
  { symbol: 'XLM-USD', name: 'Stellar', assetType: 'CRYPTO', basePrice: 0.12, volatility: 0.75, spreadBps: 28 },
  { symbol: 'NEAR-USD', name: 'NEAR Protocol', assetType: 'CRYPTO', basePrice: 3.5, volatility: 0.88, spreadBps: 25 },
  { symbol: 'FIL-USD', name: 'Filecoin', assetType: 'CRYPTO', basePrice: 5.2, volatility: 0.82, spreadBps: 24 },
  { symbol: 'AAVE-USD', name: 'Aave', assetType: 'CRYPTO', basePrice: 92, volatility: 0.80, spreadBps: 20 },
  { symbol: 'ALGO-USD', name: 'Algorand', assetType: 'CRYPTO', basePrice: 0.18, volatility: 0.78, spreadBps: 28 },
  { symbol: 'VET-USD', name: 'VeChain', assetType: 'CRYPTO', basePrice: 0.025, volatility: 0.85, spreadBps: 32 },
  { symbol: 'SHIB-USD', name: 'Shiba Inu', assetType: 'CRYPTO', basePrice: 0.000009, volatility: 0.95, spreadBps: 35 },
  { symbol: 'EOS-USD', name: 'EOS', assetType: 'CRYPTO', basePrice: 0.72, volatility: 0.72, spreadBps: 24 },
  { symbol: 'XTZ-USD', name: 'Tezos', assetType: 'CRYPTO', basePrice: 0.95, volatility: 0.76, spreadBps: 24 },
  { symbol: 'SAND-USD', name: 'The Sandbox', assetType: 'CRYPTO', basePrice: 0.42, volatility: 0.90, spreadBps: 30 },
  { symbol: 'MANA-USD', name: 'Decentraland', assetType: 'CRYPTO', basePrice: 0.38, volatility: 0.88, spreadBps: 30 },

  // --- New 25 Crypto ---
  { symbol: 'CRO-USD', name: 'Cronos', assetType: 'CRYPTO', basePrice: 0.088, volatility: 0.82, spreadBps: 28 },
  { symbol: 'APE-USD', name: 'ApeCoin', assetType: 'CRYPTO', basePrice: 1.35, volatility: 0.92, spreadBps: 30 },
  { symbol: 'GRT-USD', name: 'The Graph', assetType: 'CRYPTO', basePrice: 0.15, volatility: 0.85, spreadBps: 28 },
  { symbol: 'RUNE-USD', name: 'THORChain', assetType: 'CRYPTO', basePrice: 4.8, volatility: 0.88, spreadBps: 25 },
  { symbol: 'ENJ-USD', name: 'Enjin Coin', assetType: 'CRYPTO', basePrice: 0.28, volatility: 0.84, spreadBps: 28 },
  { symbol: 'CHZ-USD', name: 'Chiliz', assetType: 'CRYPTO', basePrice: 0.072, volatility: 0.86, spreadBps: 30 },
  { symbol: 'COMP-USD', name: 'Compound', assetType: 'CRYPTO', basePrice: 52, volatility: 0.78, spreadBps: 22 },
  { symbol: 'MKR-USD', name: 'Maker', assetType: 'CRYPTO', basePrice: 1480, volatility: 0.72, spreadBps: 18 },
  { symbol: 'SNX-USD', name: 'Synthetix', assetType: 'CRYPTO', basePrice: 2.8, volatility: 0.85, spreadBps: 26 },
  { symbol: 'YFI-USD', name: 'yearn.finance', assetType: 'CRYPTO', basePrice: 7200, volatility: 0.80, spreadBps: 20 },
  { symbol: 'SUSHI-USD', name: 'SushiSwap', assetType: 'CRYPTO', basePrice: 0.92, volatility: 0.88, spreadBps: 28 },
  { symbol: '1INCH-USD', name: '1inch Network', assetType: 'CRYPTO', basePrice: 0.35, volatility: 0.86, spreadBps: 28 },
  { symbol: 'CAKE-USD', name: 'PancakeSwap', assetType: 'CRYPTO', basePrice: 2.4, volatility: 0.84, spreadBps: 26 },
  { symbol: 'THETA-USD', name: 'Theta Network', assetType: 'CRYPTO', basePrice: 1.05, volatility: 0.82, spreadBps: 26 },
  { symbol: 'AXS-USD', name: 'Axie Infinity', assetType: 'CRYPTO', basePrice: 6.8, volatility: 0.90, spreadBps: 28 },
  { symbol: 'GALA-USD', name: 'Gala', assetType: 'CRYPTO', basePrice: 0.022, volatility: 0.92, spreadBps: 32 },
  { symbol: 'LRC-USD', name: 'Loopring', assetType: 'CRYPTO', basePrice: 0.22, volatility: 0.84, spreadBps: 28 },
  { symbol: 'IMX-USD', name: 'Immutable', assetType: 'CRYPTO', basePrice: 1.6, volatility: 0.88, spreadBps: 26 },
  { symbol: 'OP-USD', name: 'Optimism', assetType: 'CRYPTO', basePrice: 2.1, volatility: 0.86, spreadBps: 24 },
  { symbol: 'ARB-USD', name: 'Arbitrum', assetType: 'CRYPTO', basePrice: 1.15, volatility: 0.85, spreadBps: 24 },
  { symbol: 'APT-USD', name: 'Aptos', assetType: 'CRYPTO', basePrice: 8.5, volatility: 0.88, spreadBps: 24 },
  { symbol: 'SUI-USD', name: 'Sui', assetType: 'CRYPTO', basePrice: 1.25, volatility: 0.90, spreadBps: 26 },
  { symbol: 'SEI-USD', name: 'Sei', assetType: 'CRYPTO', basePrice: 0.52, volatility: 0.88, spreadBps: 28 },
  { symbol: 'TIA-USD', name: 'Celestia', assetType: 'CRYPTO', basePrice: 12.5, volatility: 0.90, spreadBps: 24 },
  { symbol: 'INJ-USD', name: 'Injective', assetType: 'CRYPTO', basePrice: 22, volatility: 0.88, spreadBps: 22 },

  // ── Stocks (50) ──
  // --- Original 25 ---
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
  { symbol: 'JPM', name: 'JPMorgan Chase', assetType: 'STOCK', basePrice: 195, volatility: 0.22, spreadBps: 5 },
  { symbol: 'V', name: 'Visa Inc.', assetType: 'STOCK', basePrice: 275, volatility: 0.20, spreadBps: 5 },
  { symbol: 'WMT', name: 'Walmart Inc.', assetType: 'STOCK', basePrice: 165, volatility: 0.18, spreadBps: 5 },
  { symbol: 'DIS', name: 'Walt Disney Co.', assetType: 'STOCK', basePrice: 95, volatility: 0.35, spreadBps: 6 },
  { symbol: 'BA', name: 'Boeing Co.', assetType: 'STOCK', basePrice: 210, volatility: 0.42, spreadBps: 7 },
  { symbol: 'PYPL', name: 'PayPal Holdings', assetType: 'STOCK', basePrice: 62, volatility: 0.45, spreadBps: 7 },
  { symbol: 'CRM', name: 'Salesforce Inc.', assetType: 'STOCK', basePrice: 265, volatility: 0.32, spreadBps: 6 },
  { symbol: 'UBER', name: 'Uber Technologies', assetType: 'STOCK', basePrice: 68, volatility: 0.42, spreadBps: 7 },
  { symbol: 'COIN', name: 'Coinbase Global', assetType: 'STOCK', basePrice: 180, volatility: 0.65, spreadBps: 10 },
  { symbol: 'SQ', name: 'Block Inc.', assetType: 'STOCK', basePrice: 72, volatility: 0.50, spreadBps: 8 },
  { symbol: 'SHOP', name: 'Shopify Inc.', assetType: 'STOCK', basePrice: 78, volatility: 0.48, spreadBps: 8 },
  { symbol: 'PLTR', name: 'Palantir Technologies', assetType: 'STOCK', basePrice: 22, volatility: 0.55, spreadBps: 8 },
  { symbol: 'SPOT', name: 'Spotify Technology', assetType: 'STOCK', basePrice: 310, volatility: 0.40, spreadBps: 7 },
  { symbol: 'SNAP', name: 'Snap Inc.', assetType: 'STOCK', basePrice: 11, volatility: 0.60, spreadBps: 9 },
  { symbol: 'RIVN', name: 'Rivian Automotive', assetType: 'STOCK', basePrice: 15, volatility: 0.65, spreadBps: 10 },

  // --- New 25 Stocks ---
  { symbol: 'BABA', name: 'Alibaba Group', assetType: 'STOCK', basePrice: 78, volatility: 0.45, spreadBps: 7 },
  { symbol: 'NKE', name: 'Nike Inc.', assetType: 'STOCK', basePrice: 105, volatility: 0.28, spreadBps: 5 },
  { symbol: 'ABNB', name: 'Airbnb Inc.', assetType: 'STOCK', basePrice: 145, volatility: 0.42, spreadBps: 7 },
  { symbol: 'RBLX', name: 'Roblox Corp.', assetType: 'STOCK', basePrice: 42, volatility: 0.55, spreadBps: 8 },
  { symbol: 'DKNG', name: 'DraftKings Inc.', assetType: 'STOCK', basePrice: 35, volatility: 0.58, spreadBps: 9 },
  { symbol: 'MSTR', name: 'MicroStrategy Inc.', assetType: 'STOCK', basePrice: 480, volatility: 0.72, spreadBps: 12 },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', assetType: 'STOCK', basePrice: 255, volatility: 0.42, spreadBps: 7 },
  { symbol: 'PANW', name: 'Palo Alto Networks', assetType: 'STOCK', basePrice: 295, volatility: 0.38, spreadBps: 6 },
  { symbol: 'ZS', name: 'Zscaler Inc.', assetType: 'STOCK', basePrice: 205, volatility: 0.45, spreadBps: 8 },
  { symbol: 'SNOW', name: 'Snowflake Inc.', assetType: 'STOCK', basePrice: 165, volatility: 0.52, spreadBps: 8 },
  { symbol: 'DASH', name: 'DoorDash Inc.', assetType: 'STOCK', basePrice: 98, volatility: 0.48, spreadBps: 8 },
  { symbol: 'ROKU', name: 'Roku Inc.', assetType: 'STOCK', basePrice: 68, volatility: 0.58, spreadBps: 9 },
  { symbol: 'TWLO', name: 'Twilio Inc.', assetType: 'STOCK', basePrice: 62, volatility: 0.50, spreadBps: 8 },
  { symbol: 'MDB', name: 'MongoDB Inc.', assetType: 'STOCK', basePrice: 385, volatility: 0.52, spreadBps: 8 },
  { symbol: 'NET', name: 'Cloudflare Inc.', assetType: 'STOCK', basePrice: 82, volatility: 0.50, spreadBps: 8 },
  { symbol: 'OKTA', name: 'Okta Inc.', assetType: 'STOCK', basePrice: 88, volatility: 0.48, spreadBps: 8 },
  { symbol: 'HOOD', name: 'Robinhood Markets', assetType: 'STOCK', basePrice: 12, volatility: 0.65, spreadBps: 10 },
  { symbol: 'SOFI', name: 'SoFi Technologies', assetType: 'STOCK', basePrice: 8.5, volatility: 0.62, spreadBps: 10 },
  { symbol: 'LCID', name: 'Lucid Group', assetType: 'STOCK', basePrice: 4.2, volatility: 0.70, spreadBps: 12 },
  { symbol: 'NIO', name: 'NIO Inc.', assetType: 'STOCK', basePrice: 6.8, volatility: 0.65, spreadBps: 10 },
  { symbol: 'XPEV', name: 'XPeng Inc.', assetType: 'STOCK', basePrice: 9.5, volatility: 0.62, spreadBps: 10 },
  { symbol: 'LI', name: 'Li Auto Inc.', assetType: 'STOCK', basePrice: 28, volatility: 0.55, spreadBps: 8 },
  { symbol: 'PATH', name: 'UiPath Inc.', assetType: 'STOCK', basePrice: 18, volatility: 0.52, spreadBps: 8 },
  { symbol: 'OPEN', name: 'Opendoor Technologies', assetType: 'STOCK', basePrice: 3.2, volatility: 0.72, spreadBps: 12 },
  { symbol: 'CPNG', name: 'Coupang Inc.', assetType: 'STOCK', basePrice: 16, volatility: 0.45, spreadBps: 7 },
];
