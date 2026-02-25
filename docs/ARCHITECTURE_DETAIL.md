# VirtuEx 아키텍처 상세 문서

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [인프라 구성](#3-인프라-구성)
4. [백엔드 서비스 상세](#4-백엔드-서비스-상세)
5. [프론트엔드 상세](#5-프론트엔드-상세)
6. [인증 플로우](#6-인증-플로우)
7. [실시간 데이터 플로우](#7-실시간-데이터-플로우)
8. [주요 시나리오별 데이터 흐름](#8-주요-시나리오별-데이터-흐름)
9. [전체 API 엔드포인트 목록](#9-전체-api-엔드포인트-목록)
10. [데이터베이스 스키마](#10-데이터베이스-스키마)
11. [로컬 실행 방법](#11-로컬-실행-방법)
12. [트러블슈팅](#12-트러블슈팅)

---

## 1. 프로젝트 개요

VirtuEx는 토스증권 스타일의 모의 거래소 웹 애플리케이션입니다.

### 기술 스택

| 영역 | 기술 |
|------|------|
| **백엔드 프레임워크** | NestJS (마이크로서비스 아키텍처) |
| **프론트엔드** | Next.js 15 (App Router), React 19 |
| **스타일링** | Tailwind CSS v4 (다크 테마) |
| **상태 관리** | Zustand 5 (클라이언트), TanStack React Query 5 (서버) |
| **차트** | Lightweight Charts 4 (TradingView 캔들스틱) |
| **실시간 통신** | Socket.io (WebSocket) |
| **HTTP 클라이언트** | Axios (JWT 인터셉터) |
| **ORM** | Prisma 6 |
| **데이터베이스** | PostgreSQL 16 |
| **캐시** | Redis 7 |
| **메시지 브로커** | Apache Kafka 3.7 |
| **패키지 관리** | pnpm (워크스페이스) |
| **빌드 오케스트레이션** | Turborepo |

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────┐
│                    Browser (4000)                     │
│              Next.js Frontend (React)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Zustand   │ │ React    │ │ Socket.io│ │ Axios  │  │
│  │ (Auth)    │ │ Query    │ │ Client   │ │ Client │  │
│  └──────────┘ └──────────┘ └────┬─────┘ └───┬────┘  │
└──────────────────────────────────┼────────────┼──────┘
                                   │ WebSocket  │ HTTP
                                   ▼            ▼
┌──────────────────────────────────────────────────────┐
│                API Gateway (3000)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Auth Proxy│ │Market    │ │Order     │ │Portfolio │ │
│  │Controller│ │Proxy     │ │Proxy     │ │Proxy     │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │ JWT Guard   │           │ x-user-id  │        │
│  ┌────┴─────────────┴───────────┴────────────┴──────┐ │
│  │              Price WebSocket Gateway              │ │
│  │              (Socket.io /prices 네임스페이스)       │ │
│  └──────────────────────────────────────────────────┘ │
└───────┬──────────┬──────────┬──────────┬─────────────┘
        │          │          │          │
   HTTP │     HTTP │     HTTP │     HTTP │
        ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│user-auth │ │market-   │ │order-    │ │portfolio │
│  (3007)  │ │data(3001)│ │engine    │ │  (3003)  │
│          │ │          │ │  (3002)  │ │          │
│ Prisma   │ │ Prisma   │ │ Prisma   │ │ Prisma   │
│    │     │ │ Redis    │ │    │     │ │    │     │
└────┼─────┘ │ Kafka    │ └────┼─────┘ └────┼─────┘
     │       └──┬──┬───┘      │            │
     ▼          ▼  ▼          ▼            ▼
┌──────────┐ ┌────┐ ┌─────┐ ┌──────────────────┐
│ mex_auth │ │Redis│ │Kafka│ │mex_orders        │
│   (DB)   │ │     │ │     │ │mex_portfolio     │
└──────────┘ └────┘ └─────┘ │mex_market  (DBs) │
                             └──────────────────┘
```

---

## 2. 프로젝트 구조

```
virtuex/
├── backend/
│   ├── packages/
│   │   ├── common/                    # 공유 라이브러리
│   │   │   └── src/
│   │   │       ├── constants/         # 상수 정의
│   │   │       ├── dto/               # 공유 DTO (auth, order, portfolio)
│   │   │       ├── events/            # 이벤트 정의 (market, order, portfolio, trade)
│   │   │       ├── interfaces/        # CloudEvent 인터페이스
│   │   │       └── utils/             # 유틸리티 (ID 생성, CloudEvent)
│   │   └── event-store/              # 이벤트 소싱 모듈
│   │       └── src/
│   │           ├── aggregate-root.base.ts
│   │           ├── event-store.module.ts
│   │           └── event-store.service.ts
│   └── services/
│       ├── api-gateway/               # API 게이트웨이 (포트 3000)
│       │   └── src/
│       │       ├── auth/              # JWT 인증 (Guard, Strategy, Decorator)
│       │       ├── gateway/           # WebSocket (Price Gateway, Subscriber)
│       │       ├── health/            # 헬스체크
│       │       └── proxy/             # 프록시 컨트롤러 (auth, market, order, portfolio)
│       ├── user-auth/                 # 인증 서비스 (포트 3007)
│       │   └── src/
│       │       ├── application/       # 비즈니스 로직 (AuthService)
│       │       ├── domain/            # 엔티티, 레포지토리 인터페이스
│       │       ├── infrastructure/    # Prisma, JWT 설정
│       │       └── presentation/      # 컨트롤러, DTO
│       ├── market-data/               # 시세 서비스 (포트 3001)
│       │   └── src/
│       │       ├── application/       # MarketDataService
│       │       ├── domain/            # Asset 엔티티, PriceEngine
│       │       ├── infrastructure/    # Prisma, Redis 캐시, Kafka 프로듀서
│       │       └── presentation/      # MarketController
│       ├── order-engine/              # 주문 엔진 (포트 3002)
│       │   └── src/
│       │       ├── application/       # OrderService
│       │       ├── domain/            # Order Aggregate, MatchingEngine
│       │       ├── infrastructure/    # Prisma
│       │       └── presentation/      # OrderController, DTOs
│       ├── portfolio/                 # 포트폴리오 서비스 (포트 3003)
│       │   └── src/
│       │       ├── domain/            # BalanceService
│       │       ├── infrastructure/    # Prisma
│       │       └── presentation/      # PortfolioController, InternalController
│       ├── notification/              # 알림 서비스 (포트 3004)
│       ├── chat/                      # 채팅 서비스 (포트 3005)
│       └── ai-service/               # AI 서비스 (포트 3006)
│
├── frontend/                          # Next.js 15 프론트엔드 (포트 4000)
│   └── src/
│       ├── app/                       # App Router
│       │   ├── layout.tsx             # 루트 레이아웃 (QueryProvider, Header, BottomNav)
│       │   ├── page.tsx               # 메인 (종목 리스트)
│       │   ├── globals.css            # Tailwind + 커스텀 테마
│       │   ├── (auth)/                # 인증 라우트 그룹
│       │   │   ├── layout.tsx         # 인증 전용 레이아웃
│       │   │   ├── login/page.tsx     # 로그인
│       │   │   └── register/page.tsx  # 회원가입
│       │   └── (main)/               # 메인 라우트 그룹
│       │       ├── layout.tsx         # 메인 레이아웃 (AuthGuard)
│       │       ├── asset/[symbol]/page.tsx  # 종목 상세
│       │       ├── portfolio/page.tsx       # 포트폴리오
│       │       ├── orders/page.tsx          # 주문 내역
│       │       └── leaderboard/page.tsx     # 리더보드
│       ├── components/
│       │   ├── chart/
│       │   │   └── CandlestickChart.tsx     # TradingView 캔들스틱 차트
│       │   ├── layout/
│       │   │   ├── Header.tsx               # 상단 네비게이션
│       │   │   ├── BottomNav.tsx            # 하단 탭 바 (모바일)
│       │   │   ├── AuthGuard.tsx            # 인증 보호 래퍼
│       │   │   └── QueryProvider.tsx        # TanStack Query Provider
│       │   ├── market/
│       │   │   ├── AssetList.tsx            # 종목 리스트
│       │   │   ├── AssetListItem.tsx        # 종목 항목 (가격, 변동률)
│       │   │   ├── PriceDisplay.tsx         # 가격 표시 (색상)
│       │   │   └── SearchBar.tsx            # 종목 검색
│       │   ├── trading/
│       │   │   ├── OrderBook.tsx            # 호가창
│       │   │   ├── OrderForm.tsx            # 주문 입력 폼
│       │   │   └── OrderSheet.tsx           # 매수/매도 바텀시트
│       │   ├── portfolio/
│       │   │   ├── BalanceCard.tsx          # 잔고 카드
│       │   │   ├── HoldingCard.tsx          # 보유 종목 (P&L)
│       │   │   └── TransactionList.tsx      # 거래 내역
│       │   └── ui/
│       │       ├── Button.tsx               # 공통 버튼
│       │       ├── Input.tsx                # 공통 입력
│       │       ├── Tabs.tsx                 # 탭 컴포넌트
│       │       ├── BottomSheet.tsx          # 바텀시트
│       │       └── Skeleton.tsx             # 로딩 스켈레톤
│       ├── hooks/
│       │   ├── useMarket.ts                 # 시세 관련 쿼리 훅
│       │   ├── useOrders.ts                 # 주문 관련 쿼리/뮤테이션 훅
│       │   ├── usePortfolio.ts              # 포트폴리오 쿼리/뮤테이션 훅
│       │   ├── useLeaderboard.ts            # 리더보드 쿼리 훅
│       │   └── useWebSocket.ts              # Socket.io 실시간 가격 훅
│       ├── stores/
│       │   └── auth.ts                      # Zustand 인증 스토어
│       ├── lib/
│       │   ├── api.ts                       # Axios 인스턴스 (인터셉터)
│       │   └── format.ts                    # 포맷 유틸리티
│       └── types/
│           └── index.ts                     # TypeScript 타입 정의
│
├── infrastructure/
│   └── docker/
│       └── postgres/
│           └── init.sql                     # DB 초기화 스크립트
├── scripts/
│   ├── dev-setup.sh                         # 개발 환경 셋업
│   └── migrate-all.sh                       # 전체 마이그레이션
├── docker-compose.yml                       # 인프라 컨테이너
├── pnpm-workspace.yaml                      # pnpm 워크스페이스
├── turbo.json                               # Turborepo 설정
└── tsconfig.base.json                       # 공통 TypeScript 설정
```

---

## 3. 인프라 구성

### Docker Compose 서비스

| 서비스 | 이미지 | 포트 | 용도 |
|--------|--------|------|------|
| `mex-postgres` | `postgres:16-alpine` | 5432 | 관계형 데이터베이스 |
| `mex-redis` | `redis:7-alpine` | 6379 | 가격 캐시, 세션 |
| `mex-kafka` | `apache/kafka:3.7.0` | 9092, 9093 | 이벤트 메시지 브로커 |

### PostgreSQL 데이터베이스 (Database per Service 패턴)

```sql
-- init.sql에서 생성되는 데이터베이스
CREATE DATABASE mex_auth;       -- user-auth 서비스
CREATE DATABASE mex_orders;     -- order-engine 서비스
CREATE DATABASE mex_portfolio;  -- portfolio 서비스
CREATE DATABASE mex_market;     -- market-data 서비스
CREATE DATABASE mex_notification; -- notification 서비스
CREATE DATABASE mex_chat;       -- chat 서비스
```

각 데이터베이스에 `pgcrypto` 확장이 활성화됩니다 (UUID 생성용).

### Kafka 토픽

| 토픽 | 파티션 | 용도 |
|------|--------|------|
| `price.updated` | 3 | 시세 업데이트 이벤트 |
| `order.events` | 3 | 주문 생성/체결/취소 이벤트 |
| `trade.events` | 3 | 체결 이벤트 |
| `portfolio.events` | 3 | 포트폴리오 변동 이벤트 |

### Redis 설정

- 최대 메모리: 256MB
- 퇴출 정책: `allkeys-lru`
- 영속성: AOF (Append Only File)

---

## 4. 백엔드 서비스 상세

### 4.1 API Gateway (포트 3000)

API Gateway는 모든 클라이언트 요청의 진입점이며, 다음 역할을 합니다:

1. **프록시**: 클라이언트 요청을 적절한 마이크로서비스로 라우팅
2. **인증**: JWT 토큰 검증 (JwtAuthGuard)
3. **WebSocket**: 실시간 가격 업데이트 브로드캐스트

#### 프록시 라우팅 규칙

| 클라이언트 요청 경로 | 라우팅 대상 | 인증 |
|---------------------|------------|------|
| `/api/auth/*` | user-auth (3007) → `/auth/*` | 일부 (me만) |
| `/api/market/*` | market-data (3001) → `/market/*` | 불필요 |
| `/api/orders/*` | order-engine (3002) → `/orders/*` | 필요 |
| `/api/portfolio/*` | portfolio (3003) → `/portfolio/*` | 일부 (leaderboard 제외) |

#### JWT 인증 구조

```typescript
// JWT Payload
{
  sub: userId,    // 사용자 ID
  email: string,
  username: string,
  role: string
}

// JwtStrategy가 반환하는 user 객체
{
  id: userId,
  email: string,
  username: string,
  role: string
}

// 프록시에서 마이크로서비스로 전달 시
// → x-user-id 헤더에 user.id 값을 설정
```

#### WebSocket Gateway (`/prices` 네임스페이스)

```
클라이언트 → subscribe { channel: "prices:BTC-USD" }
서버 → subscribed { event: "subscribed", data: { channel: "prices:BTC-USD" } }

서버 → price:update {
  channel: "prices:BTC-USD",
  data: { symbol, price, bid, ask, volume, change24h, changePercent24h, ... },
  timestamp: 1708123456789
}

클라이언트 → unsubscribe { channel: "prices:BTC-USD" }
서버 → unsubscribed { event: "unsubscribed", data: { channel: "prices:BTC-USD" } }
```

- CORS Origin: `process.env.CORS_ORIGIN` (기본값: `http://localhost:4000`)
- 자동 재연결: 최대 10회, 1초 간격

---

### 4.2 User Auth 서비스 (포트 3007)

사용자 인증 및 토큰 관리를 담당합니다.

#### API 엔드포인트

**POST /auth/register** — 회원가입
```
요청: { email: string, username: string, password: string }
응답: { success: true, data: User }

User = {
  id: string,
  email: string,
  username: string,
  role: "USER",
  createdAt: string
}
```

**POST /auth/login** — 로그인
```
요청: { email: string, password: string }
응답: {
  success: true,
  data: {
    user: User,
    accessToken: string,    // JWT (15분 유효)
    expiresIn: number       // 초 단위
  }
}
헤더: Set-Cookie: refresh_token=xxx; HttpOnly; Path=/auth; MaxAge=604800
```

**POST /auth/refresh** — 토큰 갱신
```
요청: (없음, refresh_token 쿠키 사용)
응답: {
  success: true,
  data: {
    accessToken: string,
    expiresIn: number
  }
}
헤더: Set-Cookie: refresh_token=새토큰; HttpOnly; Path=/auth; MaxAge=604800
```

**POST /auth/logout** — 로그아웃
```
응답: { success: true, message: "로그아웃 되었습니다" }
헤더: Set-Cookie: refresh_token=; MaxAge=0 (쿠키 삭제)
```

**GET /auth/me** — 내 정보 조회 (인증 필요)
```
헤더: Authorization: Bearer {accessToken}
응답: { success: true, data: User }
```

#### 쿠키 설정

| 속성 | 값 |
|------|-----|
| Name | `refresh_token` |
| HttpOnly | `true` |
| Secure | 프로덕션: `true`, 개발: `false` |
| SameSite | `lax` |
| Path | `/auth` |
| MaxAge | 7일 (604,800초) |

---

### 4.3 Market Data 서비스 (포트 3001)

시세 데이터 생성 및 제공을 담당합니다. 20개 자산(암호화폐 + 주식)의 가격을 실시간으로 시뮬레이션합니다.

#### API 엔드포인트

**GET /market/assets** — 자산 목록
```
응답: {
  success: true,
  data: AssetInfo[]
}

AssetInfo = {
  symbol: string,       // "BTC-USD"
  name: string,         // "비트코인"
  assetType: "CRYPTO" | "STOCK",
  basePrice: string,    // 기준가
  isActive: boolean
}
```

**GET /market/prices** — 전체 시세
```
응답: {
  success: true,
  data: Asset[]
}

Asset = {
  symbol: string,
  price: number,        // 현재가
  bid: number,          // 매수호가
  ask: number,          // 매도호가
  volume: number,       // 24h 거래량
  change24h: number,    // 24h 변동액
  changePercent24h: number, // 24h 변동률 (%)
  high24h: number,      // 24h 최고가
  low24h: number,       // 24h 최저가
  timestamp: string     // ISO 8601
}
```

**GET /market/prices/:symbol** — 특정 자산 시세
```
응답: { success: true, data: Asset }
```

**GET /market/prices/:symbol/history** — 가격 히스토리
```
쿼리: limit (기본 100)
응답: { success: true, data: PriceData[] }
```

**GET /market/prices/:symbol/candlesticks** — 캔들스틱 차트 데이터
```
쿼리: interval ("1m" | "5m" | "1h", 기본 "1m"), limit (기본 100)
응답: {
  success: true,
  data: Candlestick[]
}

Candlestick = {
  time: number,     // Unix timestamp (초)
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
}
```

#### 내부 동작

- **PriceEngine**: 스케줄러로 가격을 주기적으로 업데이트
- **Redis 캐시**: 최신 가격 캐싱
- **Kafka 프로듀서**: 가격 변동 시 `price.updated` 토픽에 이벤트 발행
- **API Gateway Subscriber**: Kafka에서 이벤트 수신 → WebSocket으로 클라이언트에 브로드캐스트

---

### 4.4 Order Engine 서비스 (포트 3002)

주문 접수, 매칭, 호가창 관리를 담당합니다.

#### API 엔드포인트

**POST /orders** — 주문 접수 (인증 필요)
```
헤더: x-user-id: {userId}
요청: {
  symbol: string,          // "BTC-USD"
  side: "BUY" | "SELL",
  type: "MARKET" | "LIMIT",
  quantity: number,
  price?: number,          // LIMIT 주문 시 필수
  idempotencyKey?: string  // 중복 방지 키
}
응답: { success: true, data: Order }

Order = {
  id: string,
  userId: string,
  symbol: string,
  side: "BUY" | "SELL",
  type: "MARKET" | "LIMIT",
  status: "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED",
  quantity: number,
  price: number | null,
  filledQuantity: number,
  filledPrice: number | null,
  createdAt: string,
  updatedAt: string
}
```

**PATCH /orders/:orderId** — 주문 수정 (인증 필요)
```
헤더: x-user-id: {userId}
요청: { price?: number, quantity?: number }
응답: { success: true, data: Order }
```

**DELETE /orders/:orderId** — 주문 취소 (인증 필요)
```
헤더: x-user-id: {userId}
응답: { success: true, message: "주문이 취소되었습니다" }
```

**GET /orders** — 내 주문 목록 (인증 필요)
```
헤더: x-user-id: {userId}
쿼리: limit (기본 50), offset (기본 0)
응답: { success: true, data: Order[] }
```

**GET /orders/:orderId** — 주문 상세 (인증 필요)
```
헤더: x-user-id: {userId}
응답: { success: true, data: Order }
```

**GET /orders/trades/history** — 체결 내역 (인증 필요)
```
헤더: x-user-id: {userId}
쿼리: limit (기본 50), offset (기본 0)
응답: {
  success: true,
  data: Trade[]
}

Trade = {
  id: string,
  symbol: string,
  price: number,
  quantity: number,
  side: "BUY" | "SELL",
  timestamp: string
}
```

**GET /orders/book/:symbol** — 호가창 (인증 불필요)
```
응답: {
  success: true,
  data: OrderBook
}

OrderBook = {
  asks: OrderBookEntry[],  // 매도호가 (가격 오름차순)
  bids: OrderBookEntry[],  // 매수호가 (가격 내림차순)
  spread?: number          // 스프레드
}

OrderBookEntry = {
  price: number,
  quantity: number,
  total: number            // 누적 수량
}
```

---

### 4.5 Portfolio 서비스 (포트 3003)

잔고, 보유자산, 손익 계산, 리더보드를 담당합니다.

#### API 엔드포인트

**POST /portfolio/deposit** — 입금 (인증 필요)
```
헤더: x-user-id: {userId}
요청: { amount: number }
응답: { success: true, data: Balance }
```

**GET /portfolio/balance** — 잔고 조회 (인증 필요)
```
헤더: x-user-id: {userId}
응답: { success: true, data: Balance }
```

**GET /portfolio/holdings** — 보유자산 (인증 필요)
```
헤더: x-user-id: {userId}
응답: { success: true, data: Holding[] }

Holding = {
  symbol: string,
  name: string,
  quantity: number,
  averagePrice: number,   // 평균 매입가
  currentPrice: number,   // 현재가
  value: number,          // 평가금액
  pnl: number,            // 손익
  pnlPercent: number      // 손익률 (%)
}
```

**GET /portfolio/summary** — 포트폴리오 요약 (인증 필요)
```
헤더: x-user-id: {userId}
응답: {
  success: true,
  data: Portfolio
}

Portfolio = {
  totalValue: number,       // 총 평가금액
  cashBalance: number,      // 현금 잔고
  investedValue: number,    // 투자금액
  totalPnl: number,         // 총 손익
  totalPnlPercent: number,  // 총 손익률 (%)
  holdings: Holding[]       // 보유자산 목록
}
```

**GET /portfolio/valuation** — 상세 평가 (인증 필요)
```
헤더: x-user-id: {userId}
응답: { success: true, data: Portfolio }
```

**GET /portfolio/leaderboard** — 리더보드 (인증 불필요)
```
쿼리: limit (기본 20, 최대 200)
응답: {
  success: true,
  data: LeaderboardEntry[]
}

LeaderboardEntry = {
  rank: number,
  userId: string,
  username: string,
  totalValue: number,
  pnlPercent: number
}
```

**GET /portfolio/transactions** — 거래 내역 (인증 필요)
```
헤더: x-user-id: {userId}
쿼리: limit (기본 50, 최대 200), offset (기본 0)
응답: { success: true, data: Transaction[] }
```

---

## 5. 프론트엔드 상세

### 5.1 디자인 시스템 (토스증권 스타일)

#### 색상 팔레트

| 이름 | 값 | 용도 |
|------|-----|------|
| `--color-bg-primary` | `#0D1117` | 배경 |
| `--color-bg-secondary` | `#161B22` | 카드 배경 |
| `--color-bg-tertiary` | `#21262D` | 입력 필드, 탭 배경 |
| `--color-text-primary` | `#F0F6FC` | 주요 텍스트 |
| `--color-text-secondary` | `#8B949E` | 보조 텍스트 |
| `--color-text-tertiary` | `#484F58` | 힌트 텍스트 |
| `--color-rise` | `#FF3B30` | 상승 (빨간) |
| `--color-fall` | `#007AFF` | 하락 (파란) |
| `--color-accent` | `#3B82F6` | 액센트 (버튼) |
| `--color-success` | `#10B981` | 성공 |
| `--color-border` | `#30363D` | 경계선 |

#### 레이아웃

- **상단**: Header (로고 + 네비게이션 링크)
- **하단**: BottomNav (모바일 탭 바 — 홈, 포트폴리오, 주문, 리더보드)
- **컨텐츠**: 중앙 최대 너비 제한 (`max-w-screen-xl`)

### 5.2 페이지별 상세

#### 메인 페이지 (`/`)

- 상단 검색바로 종목 필터링 (심볼, 이름)
- 20개 자산 실시간 가격 리스트
- WebSocket으로 5초마다 가격 갱신 (HTTP polling + WebSocket 실시간)
- 종목 클릭 시 `/asset/{symbol}` 이동

#### 종목 상세 (`/asset/[symbol]`)

- 상단: 종목명, 현재가 (크게), 변동률
- 차트: Lightweight Charts 캔들스틱 (1시간봉, 100개)
- 탭:
  - **호가**: 매도 8단계 / 스프레드 / 매수 8단계, 볼륨 바 시각화
  - **체결**: 최근 체결 내역 (가격, 수량, 시간)
  - **정보**: 현재가, 매수/매도호가, 24h 최고/최저, 거래량
- 하단 고정: 매수(빨간) / 매도(파란) 버튼 → OrderSheet 바텀시트

#### 포트폴리오 (`/portfolio`) — 인증 필요

- 총 자산 평가금액
- 총 손익 (금액 + 퍼센트)
- 입금 기능
- 보유 종목별: 수량, 평균단가, 현재가, 손익

#### 주문 내역 (`/orders`) — 인증 필요

- 탭: 대기중 / 체결 / 전체
- 각 주문: 심볼, 매수/매도, 유형, 수량, 가격, 상태
- PENDING 주문: 취소 버튼

#### 리더보드 (`/leaderboard`)

- 순위별 사용자 목록 (총 자산 기준)
- 상위 3명 특별 스타일링 (금/은/동)

### 5.3 상태 관리

#### Zustand Auth Store (`stores/auth.ts`)

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;   // 로그인 시
  logout: () => void;                             // 로그아웃 시
  setUser: (user: User) => void;                  // 유저 정보 업데이트
  setToken: (token: string) => void;              // 토큰 갱신 시
}
```

- `persist` 미들웨어로 `localStorage`에 저장
- 키: `virtuex-auth`

#### TanStack React Query 훅

| 훅 | 타입 | API 경로 | Query Key | 갱신 주기 |
|----|------|---------|-----------|----------|
| `useMarketPrices()` | Query | `GET /api/market/prices` | `['market', 'prices']` | 5초 |
| `useAssetPrice(symbol)` | Query | `GET /api/market/prices/{symbol}` | `['market', 'price', symbol]` | 3초 |
| `useAssets()` | Query | `GET /api/market/assets` | `['market', 'assets']` | — |
| `useCandlesticks(symbol)` | Query | `GET /api/market/prices/{symbol}/candlesticks` | `['market', 'candlesticks', ...]` | — |
| `useOrderBook(symbol)` | Query | `GET /api/orders/book/{symbol}` | `['market', 'orderbook', symbol]` | 3초 |
| `useRecentTrades(symbol)` | Query | `GET /api/orders/trades/history` | `['market', 'trades', symbol]` | 5초 |
| `useOrders(status?)` | Query | `GET /api/orders` | `['orders', status]` | 5초 |
| `usePortfolio()` | Query | `GET /api/portfolio/summary` | `['portfolio']` | 10초 |
| `usePortfolioValuation()` | Query | `GET /api/portfolio/valuation` | `['portfolio', 'valuation']` | 10초 |
| `useLeaderboard()` | Query | `GET /api/portfolio/leaderboard` | `['leaderboard']` | 30초 |
| `usePlaceOrder()` | Mutation | `POST /api/orders` | — | — |
| `useCancelOrder()` | Mutation | `DELETE /api/orders/{id}` | — | — |
| `useDeposit()` | Mutation | `POST /api/portfolio/deposit` | — | — |

**Mutation 캐시 무효화:**
- `usePlaceOrder` 성공 → `['orders']`, `['portfolio']` 무효화
- `useCancelOrder` 성공 → `['orders']`, `['portfolio']` 무효화
- `useDeposit` 성공 → `['portfolio']` 무효화

### 5.4 API 클라이언트 (`lib/api.ts`)

```
Axios 인스턴스
├── baseURL: NEXT_PUBLIC_API_URL (http://localhost:3000)
├── Request Interceptor
│   └── Authorization: Bearer {accessToken} 자동 추가
└── Response Interceptor
    └── 401 에러 시:
        ├── isRefreshing 플래그 확인
        ├── POST /api/auth/refresh (withCredentials: true)
        ├── 성공 → 토큰 갱신 + 대기열 요청 재시도
        └── 실패 → logout() + /login 리다이렉트
```

### 5.5 WebSocket 훅 (`hooks/useWebSocket.ts`)

```
useWebSocket(symbols: string[], onPriceUpdate: callback)
├── Socket.io 연결: {WS_URL}/prices
├── 옵션: transports=['websocket'], reconnection=true
├── 연결 시: symbols 배열 순회 → subscribe { channel: "prices:{symbol}" }
├── price:update 이벤트 수신 → callback(PriceUpdate)
├── symbols 변경 시: 기존 구독 해제 + 새로 구독
└── 컴포넌트 언마운트 시: disconnect
```

---

## 6. 인증 플로우

### 회원가입 → 자동 로그인

```
1. POST /api/auth/register { email, username, password }
   └→ API Gateway → user-auth
      └→ 응답: { success: true, data: User }

2. POST /api/auth/login { email, password }
   └→ API Gateway → user-auth
      └→ 응답: { accessToken, user } + Set-Cookie: refresh_token
      └→ 프론트엔드: authStore.login(user, accessToken)
```

### 로그인

```
1. 사용자가 이메일/비밀번호 입력
2. POST /api/auth/login
3. 응답에서 accessToken → Zustand store에 저장
4. refresh_token → httpOnly 쿠키에 자동 저장
5. / 페이지로 리다이렉트
```

### 토큰 갱신 (자동)

```
1. API 요청 시 401 응답 수신
2. Response Interceptor가 자동으로:
   a. isRefreshing 플래그 설정
   b. POST /api/auth/refresh (withCredentials로 쿠키 전송)
   c. 새 accessToken 수신
   d. authStore.setToken(newToken)
   e. 대기 중이던 요청들 재시도
3. 갱신 실패 시:
   a. authStore.logout()
   b. /login으로 리다이렉트
```

### 로그아웃

```
1. POST /api/auth/logout
2. 서버: refresh_token 쿠키 삭제
3. 프론트엔드: authStore.logout() → Zustand + localStorage 클리어
4. /login으로 리다이렉트
```

---

## 7. 실시간 데이터 플로우

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│ PriceEngine │────▶│   Kafka     │────▶│ API Gateway  │
│(market-data)│     │price.updated│     │  Subscriber  │
│  스케줄러    │     │             │     │              │
└─────────────┘     └─────────────┘     └──────┬───────┘
                                               │
                                   Socket.io room broadcast
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
                    │Client A │          │Client B │          │Client C │
                    │BTC 구독  │          │BTC,ETH  │          │ETH 구독  │
                    └─────────┘          └─────────┘          └─────────┘
```

1. **PriceEngine** (market-data): 스케줄러로 가격 변동 시뮬레이션
2. **Kafka**: `price.updated` 토픽에 이벤트 발행
3. **PriceSubscriber** (api-gateway): Kafka에서 이벤트 수신
4. **PriceGateway**: Socket.io room에 `price:update` 이벤트 브로드캐스트
5. **Frontend**: `useWebSocket` 훅이 이벤트 수신 → UI 업데이트

---

## 8. 주요 시나리오별 데이터 흐름

### 시나리오 1: 매수 주문 실행

```
1. 사용자: 종목 상세 → 매수 버튼 → 수량/가격 입력 → 주문 확인
2. usePlaceOrder().mutate({ symbol: "BTC-USD", side: "BUY", type: "LIMIT", quantity: 0.5, price: 95000 })
3. POST /api/orders (Authorization: Bearer xxx)
4. API Gateway:
   ├── JwtAuthGuard → JWT 검증 → user.id 추출
   └── 프록시 → order-engine (헤더: x-user-id: userId)
5. Order Engine:
   ├── 주문 생성 (status: PENDING)
   ├── MatchingEngine: 매칭 시도
   │   ├── 매칭 성공 → status: FILLED, filledQuantity, filledPrice
   │   └── 매칭 실패 → status: PENDING (호가창에 대기)
   └── 응답: Order 객체
6. 프론트엔드:
   ├── usePlaceOrder onSuccess
   ├── queryClient.invalidateQueries(['orders'])   → 주문 목록 갱신
   └── queryClient.invalidateQueries(['portfolio']) → 포트폴리오 갱신
```

### 시나리오 2: 메인 페이지 진입

```
1. / 페이지 마운트
2. useMarketPrices() → GET /api/market/prices → 20개 자산 가격
3. useAssets() → GET /api/market/assets → 자산 메타정보 (이름, 유형)
4. 두 데이터 merge → displayAssets 생성
5. useWebSocket(symbols, callback) → Socket.io 연결
   ├── subscribe: prices:BTC-USD, prices:ETH-USD, ...
   └── price:update 수신 → livePrices state 업데이트
6. 5초마다 useMarketPrices polling + WebSocket 실시간 업데이트
```

### 시나리오 3: 포트폴리오 조회 + 입금

```
1. /portfolio 페이지 마운트 (AuthGuard: 로그인 확인)
2. usePortfolio() → GET /api/portfolio/summary
   └── 응답: { totalValue, cashBalance, holdings: [...] }
3. 사용자: 입금 버튼 → 금액 입력
4. useDeposit().mutate({ amount: 1000000 })
5. POST /api/portfolio/deposit (Authorization: Bearer xxx)
6. Portfolio 서비스: 잔고 증가 → 응답
7. queryClient.invalidateQueries(['portfolio']) → 잔고 갱신
```

---

## 9. 전체 API 엔드포인트 목록

### 인증 (Auth)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/auth/register` | 불필요 | 회원가입 |
| POST | `/api/auth/login` | 불필요 | 로그인 |
| POST | `/api/auth/refresh` | 불필요 (쿠키) | 토큰 갱신 |
| POST | `/api/auth/logout` | 불필요 | 로그아웃 |
| GET | `/api/auth/me` | **필요** | 내 정보 |

### 시세 (Market)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/market/assets` | 불필요 | 자산 목록 |
| GET | `/api/market/prices` | 불필요 | 전체 시세 |
| GET | `/api/market/prices/:symbol` | 불필요 | 특정 자산 시세 |
| GET | `/api/market/prices/:symbol/history` | 불필요 | 가격 히스토리 |
| GET | `/api/market/prices/:symbol/candlesticks` | 불필요 | 캔들스틱 |

### 주문 (Orders)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/orders` | **필요** | 주문 접수 |
| GET | `/api/orders` | **필요** | 내 주문 목록 |
| GET | `/api/orders/:orderId` | **필요** | 주문 상세 |
| PATCH | `/api/orders/:orderId` | **필요** | 주문 수정 |
| DELETE | `/api/orders/:orderId` | **필요** | 주문 취소 |
| GET | `/api/orders/trades/history` | **필요** | 체결 내역 |
| GET | `/api/orders/book/:symbol` | 불필요 | 호가창 |

### 포트폴리오 (Portfolio)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/portfolio/deposit` | **필요** | 입금 |
| GET | `/api/portfolio/balance` | **필요** | 잔고 |
| GET | `/api/portfolio/holdings` | **필요** | 보유자산 |
| GET | `/api/portfolio/summary` | **필요** | 포트폴리오 요약 |
| GET | `/api/portfolio/valuation` | **필요** | 상세 평가 |
| GET | `/api/portfolio/leaderboard` | 불필요 | 리더보드 |
| GET | `/api/portfolio/transactions` | **필요** | 거래 내역 |

### WebSocket

| 네임스페이스 | 이벤트 | 방향 | 설명 |
|-------------|--------|------|------|
| `/prices` | `subscribe` | 클라이언트→서버 | 채널 구독 |
| `/prices` | `subscribed` | 서버→클라이언트 | 구독 확인 |
| `/prices` | `unsubscribe` | 클라이언트→서버 | 구독 해제 |
| `/prices` | `unsubscribed` | 서버→클라이언트 | 해제 확인 |
| `/prices` | `price:update` | 서버→클라이언트 | 가격 업데이트 |

---

## 10. 데이터베이스 스키마

### Database per Service 패턴

각 마이크로서비스는 독립적인 데이터베이스를 사용합니다.

| 서비스 | 데이터베이스 | 환경변수 |
|--------|------------|---------|
| user-auth | `mex_auth` | `USER_AUTH_DATABASE_URL` |
| market-data | `mex_market` | `MARKET_DATA_DATABASE_URL` |
| order-engine | `mex_orders` | `ORDER_ENGINE_DATABASE_URL` |
| portfolio | `mex_portfolio` | `PORTFOLIO_DATABASE_URL` |
| notification | `mex_notification` | `NOTIFICATION_DATABASE_URL` |
| chat | `mex_chat` | `CHAT_DATABASE_URL` |

각 서비스의 Prisma 스키마는 `backend/services/{서비스명}/prisma/schema.prisma`에 있습니다.

---

## 11. 로컬 실행 방법

> 자세한 명령어는 [LOCAL_RUN.md](./LOCAL_RUN.md) 참조

### 빠른 시작 (요약)

```bash
# 1. 인프라
docker compose up -d postgres redis kafka

# 2. 로컬 PostgreSQL 중지 (5432 포트 충돌 방지)
brew services stop postgresql@16

# 3. 빌드
pnpm install && npx turbo build

# 4. DB 마이그레이션 (최초 1회)
export $(grep -v '^#' .env | grep -v '^$' | xargs)
for svc in user-auth market-data order-engine portfolio; do
  cd backend/services/$svc && npx prisma db push && cd ../../..
done

# 5. 백엔드 (각 터미널에서)
export $(grep -v '^#' .env | grep -v '^$' | xargs)
node backend/services/user-auth/dist/main.js     # 터미널 1
node backend/services/market-data/dist/main.js    # 터미널 2
node backend/services/order-engine/dist/main.js   # 터미널 3
node backend/services/portfolio/dist/main.js      # 터미널 4
node backend/services/api-gateway/dist/main.js    # 터미널 5

# 6. 프론트엔드
cd frontend && pnpm dev                           # 터미널 6

# 7. 접속: http://localhost:4000
```

---

## 12. 트러블슈팅

### PostgreSQL 포트 충돌

로컬에 Homebrew PostgreSQL이 설치되어 있으면 Docker PostgreSQL과 5432 포트가 충돌합니다.

```bash
# 확인
lsof -i :5432 | grep LISTEN

# 해결: 로컬 PostgreSQL 중지
brew services stop postgresql@16

# 작업 후 복구
brew services start postgresql@16
```

### Prisma Client MODULE_NOT_FOUND

Prisma generated client가 못 찾아지는 경우:

```bash
# 각 서비스에서 Prisma client 재생성
cd backend/services/{서비스명}
npx prisma generate
cd ../../..

# 이후 빌드
npx turbo build
```

### stale tsconfig.tsbuildinfo

디렉토리 구조 변경 후 빌드가 안 되는 경우:

```bash
find backend -name "tsconfig.tsbuildinfo" -delete
npx turbo build
```

### Next.js 빌드 캐시 문제

프론트엔드 빌드 에러 시:

```bash
rm -rf frontend/.next
cd frontend && pnpm dev
```

### API 연결 실패

프론트엔드에서 API 호출이 안 되는 경우:

1. API Gateway가 실행 중인지 확인: `curl http://localhost:3000/health/live`
2. `frontend/.env.local`에 `NEXT_PUBLIC_API_URL=http://localhost:3000` 확인
3. `next.config.ts`의 rewrites 설정 확인
