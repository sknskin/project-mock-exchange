/**
 * @file 자산 도메인 엔티티
 * @description 거래 가능한 자산(종목)의 메타데이터를 표현합니다
 *
 * @file Asset Domain Entity
 * @description Represents metadata of tradeable assets
 */
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
  volatility: number; // 연간 변동성 (예: 0.6 = 60%) / annual volatility
  spreadBps: number; // 매수-매도 스프레드 (베이시스 포인트) / bid-ask spread in basis points
}

export const DEFAULT_ASSETS: AssetConfig[] = [
  // ── 암호화폐 (100개) / Crypto (100) ──
  // --- 기존 25개 / Original 25 ---
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

  // --- 암호화폐 26-50 / Crypto 26-50 ---
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

  // --- 암호화폐 51-100 (신규 50개) / Crypto 51-100 (New 50) ---
  { symbol: 'PEPE-USD', name: 'Pepe', assetType: 'CRYPTO', basePrice: 0.0000012, volatility: 0.95, spreadBps: 40 },
  { symbol: 'WLD-USD', name: 'Worldcoin', assetType: 'CRYPTO', basePrice: 2.8, volatility: 0.90, spreadBps: 28 },
  { symbol: 'BLUR-USD', name: 'Blur', assetType: 'CRYPTO', basePrice: 0.35, volatility: 0.88, spreadBps: 30 },
  { symbol: 'MEME-USD', name: 'Memecoin', assetType: 'CRYPTO', basePrice: 0.018, volatility: 0.95, spreadBps: 38 },
  { symbol: 'JTO-USD', name: 'Jito', assetType: 'CRYPTO', basePrice: 2.5, volatility: 0.88, spreadBps: 28 },
  { symbol: 'PYTH-USD', name: 'Pyth Network', assetType: 'CRYPTO', basePrice: 0.38, volatility: 0.86, spreadBps: 28 },
  { symbol: 'JUP-USD', name: 'Jupiter', assetType: 'CRYPTO', basePrice: 0.72, volatility: 0.88, spreadBps: 28 },
  { symbol: 'W-USD', name: 'Wormhole', assetType: 'CRYPTO', basePrice: 0.55, volatility: 0.86, spreadBps: 30 },
  { symbol: 'STRK-USD', name: 'Starknet', assetType: 'CRYPTO', basePrice: 1.2, volatility: 0.90, spreadBps: 28 },
  { symbol: 'ETHFI-USD', name: 'Ether.fi', assetType: 'CRYPTO', basePrice: 3.2, volatility: 0.88, spreadBps: 28 },
  { symbol: 'ENA-USD', name: 'Ethena', assetType: 'CRYPTO', basePrice: 0.85, volatility: 0.90, spreadBps: 30 },
  { symbol: 'ONDO-USD', name: 'Ondo Finance', assetType: 'CRYPTO', basePrice: 1.1, volatility: 0.86, spreadBps: 28 },
  { symbol: 'TON-USD', name: 'Toncoin', assetType: 'CRYPTO', basePrice: 5.8, volatility: 0.78, spreadBps: 22 },
  { symbol: 'FET-USD', name: 'Fetch.ai', assetType: 'CRYPTO', basePrice: 2.2, volatility: 0.88, spreadBps: 26 },
  { symbol: 'RNDR-USD', name: 'Render Token', assetType: 'CRYPTO', basePrice: 7.5, volatility: 0.85, spreadBps: 24 },
  { symbol: 'AR-USD', name: 'Arweave', assetType: 'CRYPTO', basePrice: 28, volatility: 0.85, spreadBps: 24 },
  { symbol: 'STX-USD', name: 'Stacks', assetType: 'CRYPTO', basePrice: 1.8, volatility: 0.86, spreadBps: 26 },
  { symbol: 'BONK-USD', name: 'Bonk', assetType: 'CRYPTO', basePrice: 0.000018, volatility: 0.95, spreadBps: 40 },
  { symbol: 'WIF-USD', name: 'dogwifhat', assetType: 'CRYPTO', basePrice: 2.4, volatility: 0.95, spreadBps: 35 },
  { symbol: 'PENDLE-USD', name: 'Pendle', assetType: 'CRYPTO', basePrice: 5.5, volatility: 0.88, spreadBps: 26 },
  { symbol: 'TRX-USD', name: 'TRON', assetType: 'CRYPTO', basePrice: 0.11, volatility: 0.72, spreadBps: 22 },
  { symbol: 'HBAR-USD', name: 'Hedera', assetType: 'CRYPTO', basePrice: 0.075, volatility: 0.80, spreadBps: 28 },
  { symbol: 'ICP-USD', name: 'Internet Computer', assetType: 'CRYPTO', basePrice: 12, volatility: 0.85, spreadBps: 24 },
  { symbol: 'KAS-USD', name: 'Kaspa', assetType: 'CRYPTO', basePrice: 0.12, volatility: 0.90, spreadBps: 30 },
  { symbol: 'FTM-USD', name: 'Fantom', assetType: 'CRYPTO', basePrice: 0.38, volatility: 0.88, spreadBps: 28 },
  { symbol: 'EGLD-USD', name: 'MultiversX', assetType: 'CRYPTO', basePrice: 42, volatility: 0.82, spreadBps: 24 },
  { symbol: 'FLOW-USD', name: 'Flow', assetType: 'CRYPTO', basePrice: 0.72, volatility: 0.84, spreadBps: 28 },
  { symbol: 'KLAY-USD', name: 'Klaytn', assetType: 'CRYPTO', basePrice: 0.18, volatility: 0.82, spreadBps: 30 },
  { symbol: 'ZIL-USD', name: 'Zilliqa', assetType: 'CRYPTO', basePrice: 0.022, volatility: 0.84, spreadBps: 32 },
  { symbol: 'IOTA-USD', name: 'IOTA', assetType: 'CRYPTO', basePrice: 0.22, volatility: 0.80, spreadBps: 28 },
  { symbol: 'CELO-USD', name: 'Celo', assetType: 'CRYPTO', basePrice: 0.65, volatility: 0.82, spreadBps: 28 },
  { symbol: 'ROSE-USD', name: 'Oasis Network', assetType: 'CRYPTO', basePrice: 0.095, volatility: 0.84, spreadBps: 30 },
  { symbol: 'MINA-USD', name: 'Mina Protocol', assetType: 'CRYPTO', basePrice: 0.82, volatility: 0.84, spreadBps: 28 },
  { symbol: 'CFX-USD', name: 'Conflux', assetType: 'CRYPTO', basePrice: 0.16, volatility: 0.88, spreadBps: 30 },
  { symbol: 'ONE-USD', name: 'Harmony', assetType: 'CRYPTO', basePrice: 0.014, volatility: 0.86, spreadBps: 32 },
  { symbol: 'ANKR-USD', name: 'Ankr', assetType: 'CRYPTO', basePrice: 0.028, volatility: 0.85, spreadBps: 32 },
  { symbol: 'BAT-USD', name: 'Basic Attention Token', assetType: 'CRYPTO', basePrice: 0.22, volatility: 0.80, spreadBps: 28 },
  { symbol: 'STORJ-USD', name: 'Storj', assetType: 'CRYPTO', basePrice: 0.55, volatility: 0.82, spreadBps: 28 },
  { symbol: 'CRV-USD', name: 'Curve DAO', assetType: 'CRYPTO', basePrice: 0.48, volatility: 0.85, spreadBps: 28 },
  { symbol: 'BAL-USD', name: 'Balancer', assetType: 'CRYPTO', basePrice: 3.2, volatility: 0.82, spreadBps: 26 },
  { symbol: 'DYDX-USD', name: 'dYdX', assetType: 'CRYPTO', basePrice: 2.8, volatility: 0.86, spreadBps: 26 },
  { symbol: 'GMX-USD', name: 'GMX', assetType: 'CRYPTO', basePrice: 38, volatility: 0.82, spreadBps: 24 },
  { symbol: 'PERP-USD', name: 'Perpetual Protocol', assetType: 'CRYPTO', basePrice: 0.85, volatility: 0.88, spreadBps: 30 },
  { symbol: 'MAGIC-USD', name: 'Magic', assetType: 'CRYPTO', basePrice: 0.72, volatility: 0.90, spreadBps: 30 },
  { symbol: 'LIDO-USD', name: 'Lido DAO', assetType: 'CRYPTO', basePrice: 2.1, volatility: 0.84, spreadBps: 26 },
  { symbol: 'RPL-USD', name: 'Rocket Pool', assetType: 'CRYPTO', basePrice: 22, volatility: 0.82, spreadBps: 24 },
  { symbol: 'SSV-USD', name: 'SSV Network', assetType: 'CRYPTO', basePrice: 28, volatility: 0.84, spreadBps: 26 },
  { symbol: 'CTSI-USD', name: 'Cartesi', assetType: 'CRYPTO', basePrice: 0.18, volatility: 0.86, spreadBps: 30 },
  { symbol: 'BICO-USD', name: 'Biconomy', assetType: 'CRYPTO', basePrice: 0.32, volatility: 0.88, spreadBps: 30 },
  { symbol: 'JASMY-USD', name: 'JasmyCoin', assetType: 'CRYPTO', basePrice: 0.012, volatility: 0.90, spreadBps: 35 },

  // ── 주식 (100개) / Stocks (100) ──
  // --- 기존 25개 / Original 25 ---
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

  // --- 주식 26-50 / Stocks 26-50 ---
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

  // --- 주식 51-100 (신규 50개) / Stocks 51-100 (New 50) ---
  { symbol: 'TEAM', name: 'Atlassian Corp.', assetType: 'STOCK', basePrice: 220, volatility: 0.42, spreadBps: 7 },
  { symbol: 'DOCU', name: 'DocuSign Inc.', assetType: 'STOCK', basePrice: 58, volatility: 0.48, spreadBps: 8 },
  { symbol: 'PINS', name: 'Pinterest Inc.', assetType: 'STOCK', basePrice: 35, volatility: 0.45, spreadBps: 7 },
  { symbol: 'ZM', name: 'Zoom Video Communications', assetType: 'STOCK', basePrice: 65, volatility: 0.45, spreadBps: 7 },
  { symbol: 'FUBO', name: 'fuboTV Inc.', assetType: 'STOCK', basePrice: 3.5, volatility: 0.75, spreadBps: 14 },
  { symbol: 'CHWY', name: 'Chewy Inc.', assetType: 'STOCK', basePrice: 22, volatility: 0.52, spreadBps: 8 },
  { symbol: 'ETSY', name: 'Etsy Inc.', assetType: 'STOCK', basePrice: 72, volatility: 0.48, spreadBps: 8 },
  { symbol: 'UPST', name: 'Upstart Holdings', assetType: 'STOCK', basePrice: 28, volatility: 0.72, spreadBps: 12 },
  { symbol: 'AFRM', name: 'Affirm Holdings', assetType: 'STOCK', basePrice: 38, volatility: 0.68, spreadBps: 10 },
  { symbol: 'BILL', name: 'Bill Holdings', assetType: 'STOCK', basePrice: 65, volatility: 0.52, spreadBps: 8 },
  { symbol: 'HIMS', name: 'Hims & Hers Health', assetType: 'STOCK', basePrice: 15, volatility: 0.62, spreadBps: 10 },
  { symbol: 'CAVA', name: 'CAVA Group', assetType: 'STOCK', basePrice: 52, volatility: 0.58, spreadBps: 9 },
  { symbol: 'BROS', name: 'Dutch Bros Inc.', assetType: 'STOCK', basePrice: 32, volatility: 0.55, spreadBps: 9 },
  { symbol: 'TOST', name: 'Toast Inc.', assetType: 'STOCK', basePrice: 22, volatility: 0.55, spreadBps: 9 },
  { symbol: 'MNDY', name: 'monday.com Ltd.', assetType: 'STOCK', basePrice: 195, volatility: 0.45, spreadBps: 7 },
  { symbol: 'CELH', name: 'Celsius Holdings', assetType: 'STOCK', basePrice: 55, volatility: 0.58, spreadBps: 9 },
  { symbol: 'SMCI', name: 'Super Micro Computer', assetType: 'STOCK', basePrice: 680, volatility: 0.70, spreadBps: 12 },
  { symbol: 'ARM', name: 'Arm Holdings', assetType: 'STOCK', basePrice: 135, volatility: 0.55, spreadBps: 8 },
  { symbol: 'GRAB', name: 'Grab Holdings', assetType: 'STOCK', basePrice: 3.8, volatility: 0.55, spreadBps: 10 },
  { symbol: 'SE', name: 'Sea Limited', assetType: 'STOCK', basePrice: 42, volatility: 0.58, spreadBps: 9 },
  { symbol: 'BIDU', name: 'Baidu Inc.', assetType: 'STOCK', basePrice: 105, volatility: 0.48, spreadBps: 8 },
  { symbol: 'JD', name: 'JD.com Inc.', assetType: 'STOCK', basePrice: 28, volatility: 0.50, spreadBps: 8 },
  { symbol: 'PDD', name: 'PDD Holdings', assetType: 'STOCK', basePrice: 125, volatility: 0.55, spreadBps: 8 },
  { symbol: 'TME', name: 'Tencent Music Entertainment', assetType: 'STOCK', basePrice: 11, volatility: 0.48, spreadBps: 8 },
  { symbol: 'BILI', name: 'Bilibili Inc.', assetType: 'STOCK', basePrice: 14, volatility: 0.58, spreadBps: 10 },
  { symbol: 'WDAY', name: 'Workday Inc.', assetType: 'STOCK', basePrice: 260, volatility: 0.38, spreadBps: 6 },
  { symbol: 'VEEV', name: 'Veeva Systems', assetType: 'STOCK', basePrice: 195, volatility: 0.35, spreadBps: 6 },
  { symbol: 'DDOG', name: 'Datadog Inc.', assetType: 'STOCK', basePrice: 120, volatility: 0.48, spreadBps: 7 },
  { symbol: 'TTD', name: 'The Trade Desk', assetType: 'STOCK', basePrice: 82, volatility: 0.50, spreadBps: 8 },
  { symbol: 'GTLB', name: 'GitLab Inc.', assetType: 'STOCK', basePrice: 55, volatility: 0.55, spreadBps: 9 },
  { symbol: 'HUBS', name: 'HubSpot Inc.', assetType: 'STOCK', basePrice: 580, volatility: 0.42, spreadBps: 7 },
  { symbol: 'U', name: 'Unity Software', assetType: 'STOCK', basePrice: 28, volatility: 0.62, spreadBps: 10 },
  { symbol: 'AI', name: 'C3.ai Inc.', assetType: 'STOCK', basePrice: 25, volatility: 0.68, spreadBps: 10 },
  { symbol: 'IOT', name: 'Samsara Inc.', assetType: 'STOCK', basePrice: 32, volatility: 0.52, spreadBps: 8 },
  { symbol: 'CFLT', name: 'Confluent Inc.', assetType: 'STOCK', basePrice: 28, volatility: 0.55, spreadBps: 9 },
  { symbol: 'BRZE', name: 'Braze Inc.', assetType: 'STOCK', basePrice: 48, volatility: 0.55, spreadBps: 9 },
  { symbol: 'DOCN', name: 'DigitalOcean Holdings', assetType: 'STOCK', basePrice: 35, volatility: 0.52, spreadBps: 8 },
  { symbol: 'GLBE', name: 'Global-E Online', assetType: 'STOCK', basePrice: 38, volatility: 0.52, spreadBps: 8 },
  { symbol: 'MNST', name: 'Monster Beverage', assetType: 'STOCK', basePrice: 55, volatility: 0.28, spreadBps: 5 },
  { symbol: 'LULU', name: 'Lululemon Athletica', assetType: 'STOCK', basePrice: 420, volatility: 0.38, spreadBps: 6 },
  { symbol: 'DECK', name: 'Deckers Outdoor', assetType: 'STOCK', basePrice: 680, volatility: 0.40, spreadBps: 7 },
  { symbol: 'ON', name: 'ON Semiconductor', assetType: 'STOCK', basePrice: 72, volatility: 0.48, spreadBps: 7 },
  { symbol: 'MRVL', name: 'Marvell Technology', assetType: 'STOCK', basePrice: 68, volatility: 0.50, spreadBps: 8 },
  { symbol: 'CRSP', name: 'CRISPR Therapeutics', assetType: 'STOCK', basePrice: 58, volatility: 0.62, spreadBps: 10 },
  { symbol: 'MRNA', name: 'Moderna Inc.', assetType: 'STOCK', basePrice: 95, volatility: 0.60, spreadBps: 9 },
  { symbol: 'ENPH', name: 'Enphase Energy', assetType: 'STOCK', basePrice: 115, volatility: 0.58, spreadBps: 9 },
  { symbol: 'FSLR', name: 'First Solar Inc.', assetType: 'STOCK', basePrice: 165, volatility: 0.52, spreadBps: 8 },
  { symbol: 'PLUG', name: 'Plug Power Inc.', assetType: 'STOCK', basePrice: 4.5, volatility: 0.75, spreadBps: 14 },
  { symbol: 'QS', name: 'QuantumScape Corp.', assetType: 'STOCK', basePrice: 6.2, volatility: 0.72, spreadBps: 12 },
  { symbol: 'JOBY', name: 'Joby Aviation', assetType: 'STOCK', basePrice: 5.8, volatility: 0.70, spreadBps: 12 },

  // ── 국내주식 (50개) / Korean Stocks (50) ──
  // --- KOSPI 대형주 (25개) ---
  { symbol: 'SAMSUNG.KS', name: '삼성전자', assetType: 'STOCK', basePrice: 72000, volatility: 0.30, spreadBps: 8 },
  { symbol: 'SKHYNIX.KS', name: 'SK하이닉스', assetType: 'STOCK', basePrice: 178000, volatility: 0.45, spreadBps: 10 },
  { symbol: 'LGENSOL.KS', name: 'LG에너지솔루션', assetType: 'STOCK', basePrice: 380000, volatility: 0.40, spreadBps: 12 },
  { symbol: 'SAMSUNGBIO.KS', name: '삼성바이오로직스', assetType: 'STOCK', basePrice: 780000, volatility: 0.35, spreadBps: 10 },
  { symbol: 'HYUNDAI.KS', name: '현대자동차', assetType: 'STOCK', basePrice: 185000, volatility: 0.32, spreadBps: 10 },
  { symbol: 'KIA.KS', name: '기아', assetType: 'STOCK', basePrice: 95000, volatility: 0.35, spreadBps: 10 },
  { symbol: 'POSCO.KS', name: 'POSCO홀딩스', assetType: 'STOCK', basePrice: 320000, volatility: 0.38, spreadBps: 12 },
  { symbol: 'CELLTRION.KS', name: '셀트리온', assetType: 'STOCK', basePrice: 175000, volatility: 0.42, spreadBps: 12 },
  { symbol: 'KBFIN.KS', name: 'KB금융', assetType: 'STOCK', basePrice: 65000, volatility: 0.28, spreadBps: 8 },
  { symbol: 'SHINHAN.KS', name: '신한지주', assetType: 'STOCK', basePrice: 45000, volatility: 0.27, spreadBps: 8 },
  { symbol: 'NAVER.KS', name: '네이버', assetType: 'STOCK', basePrice: 195000, volatility: 0.40, spreadBps: 10 },
  { symbol: 'KAKAO.KS', name: '카카오', assetType: 'STOCK', basePrice: 42000, volatility: 0.45, spreadBps: 12 },
  { symbol: 'SAMSUNGSDI.KS', name: '삼성SDI', assetType: 'STOCK', basePrice: 350000, volatility: 0.42, spreadBps: 12 },
  { symbol: 'LGCHEM.KS', name: 'LG화학', assetType: 'STOCK', basePrice: 310000, volatility: 0.40, spreadBps: 12 },
  { symbol: 'HYUNDAIMOBIS.KS', name: '현대모비스', assetType: 'STOCK', basePrice: 220000, volatility: 0.30, spreadBps: 10 },
  { symbol: 'SAMSUNGCNT.KS', name: '삼성물산', assetType: 'STOCK', basePrice: 115000, volatility: 0.32, spreadBps: 10 },
  { symbol: 'SKINNO.KS', name: 'SK이노베이션', assetType: 'STOCK', basePrice: 108000, volatility: 0.38, spreadBps: 12 },
  { symbol: 'HANHWA.KS', name: '한화에어로스페이스', assetType: 'STOCK', basePrice: 210000, volatility: 0.45, spreadBps: 14 },
  { symbol: 'DOOSAN.KS', name: '두산에너빌리티', assetType: 'STOCK', basePrice: 18000, volatility: 0.50, spreadBps: 15 },
  { symbol: 'KAKAOPAY.KS', name: '카카오페이', assetType: 'STOCK', basePrice: 26000, volatility: 0.48, spreadBps: 15 },
  { symbol: 'COUPANG.KS', name: '쿠팡', assetType: 'STOCK', basePrice: 28000, volatility: 0.42, spreadBps: 12 },
  { symbol: 'KRAFTON.KS', name: '크래프톤', assetType: 'STOCK', basePrice: 245000, volatility: 0.40, spreadBps: 12 },
  { symbol: 'NCSOFT.KS', name: '엔씨소프트', assetType: 'STOCK', basePrice: 195000, volatility: 0.45, spreadBps: 14 },
  { symbol: 'KAKAOBK.KS', name: '카카오뱅크', assetType: 'STOCK', basePrice: 22000, volatility: 0.42, spreadBps: 12 },
  { symbol: 'HYUNDAIELEV.KS', name: '현대엘리베이터', assetType: 'STOCK', basePrice: 85000, volatility: 0.35, spreadBps: 12 },

  // --- KOSDAQ/성장주 (25개) ---
  { symbol: 'ECOPRO.KS', name: '에코프로', assetType: 'STOCK', basePrice: 65000, volatility: 0.55, spreadBps: 18 },
  { symbol: 'ECOPROHM.KS', name: '에코프로비엠', assetType: 'STOCK', basePrice: 180000, volatility: 0.52, spreadBps: 16 },
  { symbol: 'ALTEOGEN.KS', name: '알테오젠', assetType: 'STOCK', basePrice: 280000, volatility: 0.50, spreadBps: 16 },
  { symbol: 'LBIO.KS', name: '엘앤에프', assetType: 'STOCK', basePrice: 120000, volatility: 0.52, spreadBps: 18 },
  { symbol: 'HYBE.KS', name: '하이브', assetType: 'STOCK', basePrice: 195000, volatility: 0.45, spreadBps: 14 },
  { symbol: 'PEARL.KS', name: '펄어비스', assetType: 'STOCK', basePrice: 42000, volatility: 0.48, spreadBps: 15 },
  { symbol: 'DEVSISTERS.KS', name: '데브시스터즈', assetType: 'STOCK', basePrice: 55000, volatility: 0.55, spreadBps: 18 },
  { symbol: 'SMSDI.KS', name: '삼성SDS', assetType: 'STOCK', basePrice: 155000, volatility: 0.30, spreadBps: 10 },
  { symbol: 'HANMI.KS', name: '한미반도체', assetType: 'STOCK', basePrice: 88000, volatility: 0.50, spreadBps: 16 },
  { symbol: 'KOSMOSCT.KS', name: '코스모신소재', assetType: 'STOCK', basePrice: 95000, volatility: 0.48, spreadBps: 16 },
  { symbol: 'SKBIO.KS', name: 'SK바이오팜', assetType: 'STOCK', basePrice: 78000, volatility: 0.42, spreadBps: 14 },
  { symbol: 'YUHAN.KS', name: '유한양행', assetType: 'STOCK', basePrice: 65000, volatility: 0.35, spreadBps: 12 },
  { symbol: 'LEENO.KS', name: '리노공업', assetType: 'STOCK', basePrice: 145000, volatility: 0.40, spreadBps: 14 },
  { symbol: 'ISUCHEM.KS', name: '이수페타시스', assetType: 'STOCK', basePrice: 32000, volatility: 0.52, spreadBps: 18 },
  { symbol: 'POSCOFL.KS', name: '포스코퓨처엠', assetType: 'STOCK', basePrice: 260000, volatility: 0.48, spreadBps: 16 },
  { symbol: 'SOLBRAIN.KS', name: '솔브레인', assetType: 'STOCK', basePrice: 250000, volatility: 0.38, spreadBps: 14 },
  { symbol: 'CLASSYS.KS', name: '클래시스', assetType: 'STOCK', basePrice: 38000, volatility: 0.45, spreadBps: 15 },
  { symbol: 'GENOMTREE.KS', name: '지놈앤컴퍼니', assetType: 'STOCK', basePrice: 18000, volatility: 0.55, spreadBps: 20 },
  { symbol: 'KAKAOENT.KS', name: '카카오엔터', assetType: 'STOCK', basePrice: 28000, volatility: 0.48, spreadBps: 16 },
  { symbol: 'NETMARBLE.KS', name: '넷마블', assetType: 'STOCK', basePrice: 55000, volatility: 0.42, spreadBps: 14 },
  { symbol: 'DSME.KS', name: 'HD한국조선해양', assetType: 'STOCK', basePrice: 125000, volatility: 0.45, spreadBps: 14 },
  { symbol: 'HDSENGINE.KS', name: 'HD현대인프라코어', assetType: 'STOCK', basePrice: 9500, volatility: 0.48, spreadBps: 18 },
  { symbol: 'LGDISPLAY.KS', name: 'LG디스플레이', assetType: 'STOCK', basePrice: 13000, volatility: 0.50, spreadBps: 20 },
  { symbol: 'LGINNOTEK.KS', name: 'LG이노텍', assetType: 'STOCK', basePrice: 280000, volatility: 0.40, spreadBps: 14 },
  { symbol: 'SKTELCOM.KS', name: 'SK텔레콤', assetType: 'STOCK', basePrice: 52000, volatility: 0.25, spreadBps: 8 },
];

/**
 * 내부 심볼 → Binance 스트림 이름 매핑
 * 규칙: 'XXX-USD' → 'xxxusdt' (예외는 SPECIAL_MAP에서 처리)
 *
 * Internal symbol → Binance stream name mapping
 * Rule: 'XXX-USD' → 'xxxusdt' (exceptions handled via SPECIAL_MAP)
 */
const SPECIAL_BINANCE_MAP: Record<string, string> = {
  'LIDO-USD': 'ldousdt',
};

export const BINANCE_SYMBOL_MAP = new Map<string, string>();
export const BINANCE_REVERSE_MAP = new Map<string, string>();

for (const asset of DEFAULT_ASSETS) {
  if (asset.assetType !== 'CRYPTO') continue;
  const special = SPECIAL_BINANCE_MAP[asset.symbol];
  const binanceSymbol = special ?? asset.symbol.replace('-USD', '').toLowerCase() + 'usdt';
  BINANCE_SYMBOL_MAP.set(asset.symbol, binanceSymbol);
  BINANCE_REVERSE_MAP.set(binanceSymbol, asset.symbol);
}
