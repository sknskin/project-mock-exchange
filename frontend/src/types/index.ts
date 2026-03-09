/**
 * @file 프론트엔드 타입 정의
 * @description Asset, PriceUpdate, Order 등 프론트엔드 공통 타입
 *
 * @file Frontend Type Definitions
 * @description Common frontend types: Asset, PriceUpdate, Order, etc.
 */
// 사용자 기본 정보 / Basic user info
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  /** 역할: USER, ADMIN, SYSTEM
   * Role: USER, ADMIN, SYSTEM */
  role: string;
  isActive: boolean;
  /** 승인 상태: PENDING, APPROVED, REJECTED
   * Approval status */
  approvalStatus: string;
  phone?: string;
  createdAt: string;
}

// 로그인 응답 / Login response
export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    /** 토큰 만료 시간 (초)
     * Token expiration (seconds) */
    expiresIn: number;
  };
}

// 회원가입 응답 / Registration response
export interface RegisterResponse {
  success: boolean;
  data: User;
}

// 종목 기본 정보 (관리자) / Asset basic info (admin)
export interface AssetInfo {
  symbol: string;
  name: string;
  assetType: 'CRYPTO' | 'STOCK';
  /** 기준가 (문자열)
   * Base price (string) */
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

// 캔들스틱(OHLCV) 데이터 / Candlestick (OHLCV) data
export interface Candlestick {
  /** Unix 타임스탬프 (초)
   * Unix timestamp (seconds) */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 호가 개별 항목 / Individual order book entry
export interface OrderBookEntry {
  price: number;
  quantity: number;
  /** 누적 수량
   * Cumulative quantity */
  total: number;
}

// 호가창 데이터 / Order book data
export interface OrderBook {
  /** 매도 호가 (낮은 가격순)
   * Ask orders (ascending price) */
  asks: OrderBookEntry[];
  /** 매수 호가 (높은 가격순)
   * Bid orders (descending price) */
  bids: OrderBookEntry[];
  /** 매수/매도 스프레드
   * Bid-ask spread */
  spread?: number;
}

// 주문 데이터 / Order data
export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
  quantity: number;
  /** 지정가 (시장가 시 null)
   * Limit price (null for market orders) */
  price: number | null;
  /** 체결 수량
   * Filled quantity */
  filledQuantity: number;
  /** 체결 가격
   * Filled price */
  filledPrice: number | null;
  /** 트리거 가격 (조건부 주문)
   * Trigger price (conditional order) */
  triggerPrice?: number | null;
  /** 트리거 유형: 손절/익절
   * Trigger type: stop-loss/take-profit */
  triggerType?: 'STOP_LOSS' | 'TAKE_PROFIT' | null;
  /** 트리거 발동 여부
   * Whether triggered */
  triggered?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 주문 요청 / Place order request
export interface PlaceOrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  /** 지정가 (LIMIT 주문 시)
   * Limit price (for LIMIT orders) */
  price?: number;
  triggerPrice?: number;
  triggerType?: 'STOP_LOSS' | 'TAKE_PROFIT';
}

// 포트폴리오 데이터 / Portfolio data
export interface Portfolio {
  /** 총 자산 가치 (현금 + 투자)
   * Total asset value (cash + investments) */
  totalValue: number;
  /** 현금 잔고
   * Cash balance */
  cashBalance: number;
  /** 투자 금액 (시가)
   * Invested value (market) */
  investedValue: number;
  /** 총 매입 비용
   * Total cost basis */
  totalCost: number;
  /** 총 시장 가치
   * Total market value */
  totalMarketValue: number;
  /** 총 손익
   * Total profit/loss */
  totalPnl: number;
  /** 총 손익률 (%)
   * Total P&L percentage */
  totalPnlPercent: number;
  /** 투자 수익률 (%)
   * Invested return percentage */
  investedReturnPercent: number;
  /** 실현 손익
   * Realized P&L */
  realizedPnl: number;
  /** 미실현 손익
   * Unrealized P&L */
  unrealizedPnl: number;
  /** 순 입금액
   * Net deposit */
  netDeposit: number;
  /** 보유 종목 목록
   * Holdings list */
  holdings: Holding[];
}

// 보유 종목 / Holding
export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  /** 평균 매입가
   * Average purchase price */
  averagePrice: number;
  currentPrice: number;
  /** 현재 평가금액
   * Current market value */
  value: number;
  /** 손익 금액
   * P&L amount */
  pnl: number;
  /** 손익률 (%)
   * P&L percentage */
  pnlPercent: number;
}

// 리더보드 항목 / Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  id: string;
  /** 현재 사용자 여부
   * Whether this is the current user */
  isMe: boolean;
  username: string;
  name?: string;
  totalValue: number;
  pnlPercent: number;
}

// 체결 내역 / Trade record
export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: string;
}

// 실시간 가격 업데이트 (WebSocket) / Real-time price update (WebSocket)
export interface PriceUpdate {
  symbol: string;
  price: number;
  changePercent: number;
  changeAmount: number;
  volume: number;
  /** Unix 타임스탬프 (ms)
   * Unix timestamp (ms) */
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

// 페이지네이션 응답 제네릭 / Paginated response generic
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
  totpEnabled?: boolean;
  encryptedRrn?: string | null;
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
  name: string;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  senderRole?: string;
  content: string;
  createdAt: string;
  unreadCount: number;
}

export interface ChatLastMessage {
  id: string;
  content: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
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

// 트레이더 팔로우 (Trader Follow)
export interface TraderFollow {
  id: string;
  followerId: string;
  followeeId: string;
  /** 알림 모드: ALL, BUY_ONLY, SELL_ONLY, OFF
   * Notification mode: ALL, BUY_ONLY, SELL_ONLY, OFF */
  notifyMode: string;
  createdAt: string;
}

// 팔로우 카운트 (Follow Counts)
export interface FollowCounts {
  followingCount: number;
  followerCount: number;
}

// 트레이더 활동 (Trader Activity)
export interface TraderActivity {
  id: string;
  userId: string;
  username?: string;
  name?: string;
  /** 활동 유형: TRADE 등
   * Activity type: TRADE, etc. */
  type: string;
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  createdAt: string;
}

// 카피 트레이딩 설정 (Copy Trade Config)
export interface CopyTradeConfig {
  id: string;
  followerId: string;
  traderId: string;
  traderName?: string;
  isActive: boolean;
  /** 복사 비율 (0.1 ~ 5.0)
   * Scale ratio (0.1 ~ 5.0) */
  scaleRatio: string;
  /** 최대 투자금
   * Maximum investment amount */
  maxInvestment: string;
  /** 손절 비율 (%)
   * Stop loss percentage (%) */
  stopLossPercent?: string;
  /** 총 투자 금액
   * Total invested amount */
  totalInvested: string;
  createdAt: string;
}

// 카피 트레이딩 실행 내역 (Copy Trade Execution)
export interface CopyTradeExecution {
  id: string;
  configId: string;
  traderId: string;
  traderName?: string;
  originalTradeId: string;
  copiedOrderId?: string;
  symbol: string;
  side: string;
  originalQty: string;
  copiedQty: string;
  price: string;
  /** 실행 상태: EXECUTED, FAILED, SKIPPED, PENDING
   * Execution status: EXECUTED, FAILED, SKIPPED, PENDING */
  status: string;
  failReason?: string;
  createdAt: string;
}

// 앱 알림 (App Notification — for follow/copy-trade features)
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
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
