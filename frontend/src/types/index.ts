/**
 * @file 프론트엔드 타입 정의
 * @description Asset, PriceUpdate, Order 등 프론트엔드 공통 타입
 *
 * @file Frontend Type Definitions
 * @description Common frontend types: Asset, PriceUpdate, Order, etc.
 */
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  approvalStatus: string;
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
  // 시세 API 응답 필드 / From prices endpoint
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;
  // 종목 목록에서 병합 / Merged from assets list
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

// 관리자 사용자 관리 (Admin User Management)
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  approvalStatus: string;
  phone: string;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByUsername: string | null;
  approvalNote: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectedByUsername: string | null;
  rejectionNote: string | null;
  address: string;
  addressDetail: string | null;
  zipCode: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 공지사항 (Announcements)
export interface AnnouncementAuthor {
  id: string;
  username: string;
  name: string;
  role: string;
}

export interface AttachmentItem {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface AnnouncementListItem {
  id: string;
  title: string;
  author: AnnouncementAuthor;
  commentCount: number;
  attachmentCount: number;
  viewCount: number;
  likeCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentItem {
  id: string;
  content: string;
  author: AnnouncementAuthor;
  parentId: string | null;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: CommentItem[];
}

export interface AnnouncementDetail {
  id: string;
  title: string;
  content: string;
  author: AnnouncementAuthor;
  isPinned: boolean;
  viewCount: number;
  likeCount: number;
  isLiked: boolean;
  attachments: AttachmentItem[];
  comments: CommentItem[];
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
}

// 알림 (Notifications)
export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

// 프로필 (Profile)
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  phone: string;
  address: string;
  addressDetail: string | null;
  zipCode: string;
  isActive: boolean;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
}

// 통계 (Statistics)
export interface StatOverview {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalAnnouncements: number;
  totalPageViews: number;
  todayLogins: number;
}

export interface TimelineEntry {
  label: string;
  count: number;
}

export interface TopPage {
  path: string;
  count: number;
}

export interface UserStatByRole {
  role: string;
  count: number;
}

export interface UserStatByStatus {
  approvalStatus: string;
  isActive: boolean;
  count: number;
}

// 개요 추이 (오늘 vs 어제) (Overview Trend, today vs yesterday)
export interface OverviewTrendItem {
  today: number;
  yesterday: number;
  changePercent: number;
}

export interface OverviewTrend {
  newUsers: OverviewTrendItem;
  logins: OverviewTrendItem;
  pageViews: OverviewTrendItem;
  announcements: OverviewTrendItem;
}

// 거래 통계 (Trading Stats)
export interface TradingStats {
  totalOrders: number;
  totalVolume: number;
  avgOrderSize: number;
  buyCount: number;
  sellCount: number;
  dailyVolume: { date: string; buy: number; sell: number; total: number }[];
  popularAssets: { symbol: string; volume: number }[];
}

// 뉴스 (News)
export interface NewsItem {
  id: string;
  category: 'CRYPTO' | 'DOMESTIC_STOCK' | 'FOREIGN_STOCK';
  title: string;
  summary: string | null;
  sourceUrl: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string | null;
  scrapedAt: string;
}

export interface ScrapeStatus {
  category: string;
  scrapedAt: string;
  count: number;
}

// 인기 공지사항 (Popular Announcements)
export interface PopularAnnouncement {
  id: string;
  title: string;
  commentCount: number;
  likeCount?: number;
}

// 채팅 (Chat)
export interface ChatParticipant {
  id: string;
  userId: string;
  username: string;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string;
  unreadCount: number;
}

export interface ChatLastMessage {
  id: string;
  content: string;
  senderId: string;
  senderUsername: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  name: string | null;
  type: 'DM' | 'GROUP';
  participants: ChatParticipant[];
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatUserSearchResult {
  id: string;
  username: string;
  name: string;
}

// 가격 알림 (Price Alerts)
export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  targetPrice: string;
  condition: 'ABOVE' | 'BELOW';
  isActive: boolean;
  triggeredAt: string | null;
  createdAt: string;
}
