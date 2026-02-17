# Mock Exchange — Production-Grade Architecture Design

> 실시간 모의 주식/암호화폐 거래 플랫폼의 전체 아키텍처 설계 문서입니다.
> 한글 버전은 [ARCHITECTURE_SUMMARY_KR.md](./ARCHITECTURE_SUMMARY_KR.md)를 참고하세요.

> Real-time mock stock/crypto trading platform with chat, notification, and AI features.
> Designed for 1,000+ concurrent traders, horizontal scalability, and Kubernetes deployment.

---

## Table of Contents

1. [Microservice Boundaries](#1-microservice-boundaries)
2. [Event Flow Between Services](#2-event-flow-between-services)
3. [CQRS Command & Query Separation](#3-cqrs-command--query-separation)
4. [Event Store Schema](#4-event-store-schema)
5. [PostgreSQL Read Models](#5-postgresql-read-models)
6. [Redis Usage Strategy](#6-redis-usage-strategy)
7. [Saga Orchestration vs Choreography](#7-saga-orchestration-vs-choreography)
8. [WebSocket Gateway Architecture](#8-websocket-gateway-architecture)
9. [Kubernetes Deployment Strategy](#9-kubernetes-deployment-strategy)
10. [CI/CD Pipeline Strategy](#10-cicd-pipeline-strategy)
11. [Scaling Bottlenecks](#11-scaling-bottlenecks)
12. [Trade-offs in Detail](#12-trade-offs-in-detail)
13. [Phased MVP to Enterprise Roadmap](#13-phased-mvp-to-enterprise-roadmap)
14. [Load Testing Strategy](#14-load-testing-strategy)
15. [Failure Simulation Strategy](#15-failure-simulation-strategy)
16. [Local Development Docker Compose](#16-local-development-docker-compose)
17. [Folder Structure](#17-folder-structure)

---

## 1. Microservice Boundaries

### Service Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway (Kong / custom NestJS)          │
│                    Rate Limiting · Auth · Routing · WS Upgrade      │
└────────┬──────────┬──────────┬──────────┬──────────┬───────────┬────┘
         │          │          │          │          │           │
    ┌────▼───┐ ┌────▼────┐ ┌──▼───┐ ┌───▼────┐ ┌──▼────┐ ┌───▼───┐
    │ Market │ │ Order   │ │ Port │ │ Notif  │ │ Chat  │ │  AI   │
    │ Data   │ │ Matching│ │ folio│ │ ication│ │       │ │       │
    │ Service│ │ Engine  │ │      │ │        │ │       │ │       │
    └────────┘ └─────────┘ └──────┘ └────────┘ └───────┘ └───────┘
         │          │          │          │          │           │
    ┌────▼──────────▼──────────▼──────────▼──────────▼───────────▼────┐
    │                    Event Bus (Kafka)                             │
    │           + Redis (Cache/PubSub/Lock) + BullMQ (Jobs)           │
    └─────────────────────────────────────────────────────────────────┘
```

### 1.1 API Gateway Service
- **Bounded Context:** Edge routing, authentication, rate limiting
- **Responsibilities:**
  - JWT validation and token refresh
  - Rate limiting (per-user, per-IP, per-endpoint)
  - Request routing to downstream services (HTTP + gRPC)
  - WebSocket upgrade and connection management
  - Request/response transformation
  - CORS, helmet, compression
- **Tech:** NestJS, Passport, Redis (rate limit counters)
- **Scaling:** Stateless; horizontal via K8s replicas behind LoadBalancer

### 1.2 Market Data Service
- **Bounded Context:** Price simulation, price distribution
- **Responsibilities:**
  - Simulated exchange engine with realistic price movements (geometric Brownian motion + order book pressure)
  - Server-authoritative pricing (single source of truth)
  - Candlestick aggregation (1m, 5m, 15m, 1h, 1d)
  - Order book depth simulation
  - Price snapshot persistence
  - Publish `PriceUpdated` events to Kafka
  - Broadcast prices to WebSocket subscribers via Redis PubSub
- **Data Ownership:** Price history, candlestick data, asset metadata
- **Tech:** NestJS, Redis PubSub, Kafka producer, PostgreSQL (read model for history)
- **Scaling:** Single writer (leader election via Redis lock), multiple read replicas for WS fan-out

### 1.3 Order Matching Engine (Core Service)
- **Bounded Context:** Order lifecycle, trade execution
- **Responsibilities:**
  - Accept and validate orders (market, limit)
  - Price-time priority matching algorithm
  - Event sourcing for all order state transitions
  - Concurrent order handling with strict consistency
  - Publish domain events: `OrderPlaced`, `OrderMatched`, `OrderPartiallyFilled`, `OrderCancelled`, `TradeExecuted`
  - Idempotent order submission (client-generated idempotency key)
- **Data Ownership:** Event Store (order events), order book state
- **Tech:** NestJS, EventStoreDB (or custom PostgreSQL event store), Redis (distributed locks for order book segments)
- **Scaling:** Partition by asset symbol (each asset's order book on one node). Horizontally scalable across assets, not within a single asset's order book (strict ordering required).
- **Consistency Model:** **Strong consistency** within a single asset's order book. This is the ONE service where we choose CP over AP.

### 1.4 Portfolio Service
- **Bounded Context:** User balances, holdings, P&L
- **Responsibilities:**
  - Maintain user cash balances and asset holdings
  - Reserve funds on order placement (saga participant)
  - Release/deduct funds on trade execution or cancellation
  - Calculate unrealized P&L (real-time via market data)
  - Calculate realized P&L (on trade execution)
  - CQRS: write model processes commands, read model serves queries
  - Project events from Order service into portfolio read model
- **Data Ownership:** Account balances, holdings, transaction history
- **Tech:** NestJS, PostgreSQL (write + read models), Kafka consumer, Redis (balance cache)
- **Scaling:** Partition by user ID. Stateless command handlers + projected read models.

### 1.5 Notification Service
- **Bounded Context:** User notifications, alerts
- **Responsibilities:**
  - Consume events: `TradeExecuted`, `OrderFilled`, `PriceAlertTriggered`, `OrderCancelled`
  - Manage user notification preferences
  - Price alert management (user-defined thresholds)
  - Deliver via: WebSocket push, in-app notification store, (future: email/SMS)
  - Notification history and read/unread tracking
  - Dead letter queue for failed deliveries
- **Data Ownership:** Notification records, alert configurations
- **Tech:** NestJS, Kafka consumer, BullMQ (delivery jobs), PostgreSQL, Redis
- **Scaling:** Stateless consumers, scale by increasing Kafka consumer group instances

### 1.6 Chat Service
- **Bounded Context:** Real-time messaging, presence
- **Responsibilities:**
  - Global chat room
  - Asset-specific chat rooms (e.g., #BTC, #AAPL)
  - Presence tracking (online/typing indicators)
  - Message history and pagination
  - Rate limiting per user
  - Content moderation (delegate to AI service)
- **Data Ownership:** Chat messages, room membership, presence state
- **Tech:** NestJS, Redis PubSub (cross-instance message fanout), PostgreSQL (message persistence), Redis (presence TTL keys)
- **Scaling:** Horizontally scalable via Redis PubSub for cross-node message delivery. Each instance handles a subset of WebSocket connections.

### 1.7 AI Service
- **Bounded Context:** AI-powered analysis and moderation
- **Responsibilities:**
  - Trade suggestion bot (based on technical indicators + market data)
  - Portfolio analysis and risk assessment
  - Chat content moderation (toxicity, spam detection)
  - Async processing via job queue
- **Data Ownership:** AI analysis results, moderation logs
- **Tech:** NestJS, BullMQ (job queue), OpenAI/Anthropic API, Redis, PostgreSQL
- **Scaling:** Worker pool pattern via BullMQ. Scale workers independently.

### 1.8 User/Auth Service
- **Bounded Context:** Identity, authentication, authorization
- **Responsibilities:**
  - User registration/login
  - JWT access token (short-lived) + refresh token (httpOnly cookie)
  - User profile management
  - Role-based access control
- **Data Ownership:** User accounts, credentials, roles
- **Tech:** NestJS, PostgreSQL, bcrypt, JWT
- **Scaling:** Stateless, horizontally scalable

### Service Communication Matrix

| From → To                | Protocol    | Pattern         |
|--------------------------|-------------|-----------------|
| Gateway → All Services   | HTTP/gRPC   | Request-Reply   |
| Market Data → All        | Kafka       | Pub-Sub         |
| Market Data → Gateway    | Redis PubSub| Pub-Sub (WS)    |
| Order Engine → Portfolio | Kafka       | Event-Driven    |
| Order Engine → Notif     | Kafka       | Event-Driven    |
| Portfolio → Notif        | Kafka       | Event-Driven    |
| Chat → AI               | BullMQ      | Async Job       |
| AI → Chat               | Kafka       | Event callback  |
| Any → Any (query)       | gRPC        | Request-Reply   |

---

## 2. Event Flow Between Services

### 2.1 Core Trading Flow (Order Lifecycle)

```
User                Gateway          Order Engine        Portfolio          Notification
 │                    │                   │                  │                   │
 │─── PlaceOrder ────►│                   │                  │                   │
 │                    │── ValidateAuth ──►│                  │                   │
 │                    │                   │                  │                   │
 │                    │                   │── ReserveFunds ─►│                   │
 │                    │                   │                  │── FundsReserved ─►│
 │                    │                   │◄─ FundsReserved ─│                   │
 │                    │                   │                  │                   │
 │                    │                   │─┐ MatchOrder     │                   │
 │                    │                   │ │ (Event Sourced) │                   │
 │                    │                   │◄┘                │                   │
 │                    │                   │                  │                   │
 │                    │                   │─── TradeExecuted ──────────────────►│
 │                    │                   │                  │                   │
 │                    │                   │─── TradeExecuted ►│                  │
 │                    │                   │                  │── UpdateHoldings  │
 │                    │                   │                  │── SettleFunds     │
 │                    │                   │                  │                   │
 │◄── WS: OrderFilled─│                  │                  │                   │
 │◄── WS: Notification│                  │                  │◄── TradeNotif ───│
```

### 2.2 Kafka Topic Design

```
Topics:
├── market.prices.updated          # Partition by asset symbol
│   └── Key: symbol (e.g., "BTC-USD")
│   └── Value: { symbol, price, bid, ask, volume, timestamp }
│
├── orders.commands                # Partition by asset symbol
│   └── Key: symbol
│   └── Value: { orderId, userId, symbol, side, type, price, quantity, idempotencyKey }
│
├── orders.events                  # Partition by asset symbol
│   └── Key: orderId
│   └── Events: OrderPlaced, OrderMatched, OrderPartiallyFilled,
│               OrderCancelled, OrderRejected, OrderExpired
│
├── trades.executed                # Partition by asset symbol
│   └── Key: tradeId
│   └── Value: { tradeId, buyOrderId, sellOrderId, symbol, price, quantity, timestamp }
│
├── portfolio.events               # Partition by userId
│   └── Key: userId
│   └── Events: FundsReserved, FundsReleased, FundsSettled,
│               HoldingsUpdated, BalanceUpdated
│
├── notifications.commands         # Partition by userId
│   └── Key: userId
│   └── Value: { type, userId, payload, channel }
│
├── chat.messages                  # Partition by roomId
│   └── Key: roomId
│   └── Value: { messageId, roomId, userId, content, timestamp }
│
├── ai.jobs                        # Round-robin partition
│   └── Value: { jobType, payload, callbackTopic }
│
├── ai.results                     # Partition by requestId
│   └── Value: { requestId, jobType, result }
│
└── dlq.*                          # Dead letter queues (mirror of each topic)
    └── dlq.orders.events
    └── dlq.portfolio.events
    └── dlq.notifications.commands
```

### 2.3 Event Schema (CloudEvents-compatible)

```json
{
  "specversion": "1.0",
  "id": "evt_01H8X9...",
  "source": "mock-exchange/order-engine",
  "type": "com.mockexchange.order.placed",
  "time": "2026-02-17T10:30:00.000Z",
  "datacontenttype": "application/json",
  "subject": "order/ord_01H8X9...",
  "data": {
    "orderId": "ord_01H8X9...",
    "userId": "usr_01H8X9...",
    "symbol": "BTC-USD",
    "side": "BUY",
    "type": "LIMIT",
    "price": "42150.00",
    "quantity": "0.5",
    "idempotencyKey": "idem_01H8X9..."
  },
  "metadata": {
    "correlationId": "corr_01H8X9...",
    "causationId": "evt_01H8X8...",
    "version": 1
  }
}
```

---

## 3. CQRS Command & Query Separation

### 3.1 Architecture Overview

```
                    ┌──────────────┐
   Commands ───────►│ Command Side │──── Events ───►  Kafka
   (writes)         │ (Write Model)│                    │
                    └──────────────┘                    │
                                                       ▼
                    ┌──────────────┐             ┌──────────┐
   Queries ────────►│  Query Side  │◄────────────│ Projector│
   (reads)          │ (Read Model) │             │ (Consumer)│
                    └──────────────┘             └──────────┘
```

### 3.2 Order Matching Engine — Commands

| Command              | Handler                  | Produces Events                           |
|----------------------|--------------------------|-------------------------------------------|
| `PlaceOrder`         | `PlaceOrderHandler`      | `OrderPlaced`, `OrderRejected`            |
| `CancelOrder`        | `CancelOrderHandler`     | `OrderCancelled`, `CancelRejected`        |
| `ModifyOrder`        | `ModifyOrderHandler`     | `OrderModified`                           |
| `MatchOrders`        | `MatchOrdersHandler`     | `OrderMatched`, `TradeExecuted`           |

**Command Bus Flow:**
```
Controller → CommandBus → CommandHandler → Aggregate → EventStore → EventBus → Kafka
```

### 3.3 Order Matching Engine — Queries

| Query                    | Handler                     | Read Model Source     |
|--------------------------|-----------------------------|-----------------------|
| `GetOrderById`           | `GetOrderByIdHandler`       | PostgreSQL read model |
| `GetOrderBook`           | `GetOrderBookHandler`       | Redis (cached)        |
| `GetUserOrders`          | `GetUserOrdersHandler`      | PostgreSQL read model |
| `GetTradeHistory`        | `GetTradeHistoryHandler`    | PostgreSQL read model |
| `GetOrderBookDepth`      | `GetOrderBookDepthHandler`  | Redis (cached)        |

### 3.4 Portfolio Service — Commands

| Command              | Handler                  | Produces Events                     |
|----------------------|--------------------------|-------------------------------------|
| `ReserveFunds`       | `ReserveFundsHandler`    | `FundsReserved`, `ReserveFailed`    |
| `ReleaseFunds`       | `ReleaseFundsHandler`    | `FundsReleased`                     |
| `SettleTrade`        | `SettleTradeHandler`     | `FundsSettled`, `HoldingsUpdated`   |
| `DepositFunds`       | `DepositFundsHandler`    | `FundsDeposited`                    |
| `WithdrawFunds`      | `WithdrawFundsHandler`   | `FundsWithdrawn`                    |

### 3.5 Portfolio Service — Queries

| Query                        | Handler                        | Source                  |
|------------------------------|--------------------------------|-------------------------|
| `GetBalance`                 | `GetBalanceHandler`            | Redis cache → PG read  |
| `GetHoldings`                | `GetHoldingsHandler`           | Redis cache → PG read  |
| `GetPortfolioSummary`        | `GetPortfolioSummaryHandler`   | PG read + Market Data   |
| `GetPnL`                     | `GetPnLHandler`                | PG read + live prices   |
| `GetTransactionHistory`      | `GetTransactionHistoryHandler` | PG read model           |

### 3.6 Strict Separation Rules

```
Command Side:                          Query Side:
├── No direct DB reads for response    ├── No writes to write model
├── Returns only acknowledgment/ID     ├── Reads from projected read models
├── Validates via aggregate state      ├── Can join across multiple projections
├── Event Store is source of truth     ├── Eventually consistent (acceptable)
└── Strong consistency                 └── Optimized for read performance
```

---

## 4. Event Store Schema

### 4.1 Custom PostgreSQL Event Store

We use a **custom PostgreSQL-based event store** rather than EventStoreDB for operational simplicity and to leverage existing PostgreSQL expertise. The design supports append-only writes, optimistic concurrency, and efficient stream reads.

```sql
-- Core event store table (append-only)
CREATE TABLE event_store (
    global_position   BIGSERIAL PRIMARY KEY,
    stream_id         VARCHAR(255) NOT NULL,        -- e.g., "order-ord_01H8X9"
    stream_position   INTEGER NOT NULL,             -- version within stream
    event_type        VARCHAR(255) NOT NULL,        -- e.g., "OrderPlaced"
    event_data        JSONB NOT NULL,               -- event payload
    metadata          JSONB NOT NULL DEFAULT '{}',  -- correlationId, causationId, userId
    event_id          UUID NOT NULL UNIQUE,         -- idempotency
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Optimistic concurrency: unique stream + position
    CONSTRAINT uq_stream_position UNIQUE (stream_id, stream_position)
);

-- Indexes for efficient reads
CREATE INDEX idx_event_store_stream_id ON event_store (stream_id, stream_position ASC);
CREATE INDEX idx_event_store_type ON event_store (event_type);
CREATE INDEX idx_event_store_created_at ON event_store (created_at);
CREATE INDEX idx_event_store_correlation ON event_store USING GIN ((metadata->'correlationId'));

-- Snapshot table for aggregate state optimization
CREATE TABLE event_snapshots (
    stream_id         VARCHAR(255) PRIMARY KEY,
    snapshot_data     JSONB NOT NULL,
    stream_position   INTEGER NOT NULL,             -- position at which snapshot was taken
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription checkpoints (for projectors/consumers)
CREATE TABLE event_subscriptions (
    subscription_id   VARCHAR(255) PRIMARY KEY,
    last_position     BIGINT NOT NULL DEFAULT 0,    -- global_position last processed
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.2 Event Store Operations

```
APPEND EVENT (with optimistic concurrency):
─────────────────────────────────────────────
INSERT INTO event_store (stream_id, stream_position, event_type, event_data, metadata, event_id)
VALUES ($1, $2, $3, $4, $5, $6)
-- If stream_position conflicts → ConcurrencyException → reload aggregate, retry

READ STREAM (rebuild aggregate):
─────────────────────────────────
SELECT * FROM event_store
WHERE stream_id = $1
  AND stream_position > $2   -- start after snapshot position
ORDER BY stream_position ASC

SUBSCRIBE (catch-up subscription for projectors):
──────────────────────────────────────────────────
SELECT * FROM event_store
WHERE global_position > $1   -- last checkpoint
ORDER BY global_position ASC
LIMIT 1000
-- Combined with LISTEN/NOTIFY for real-time push
```

### 4.3 Aggregate Lifecycle Example (Order)

```
Stream: "order-ord_ABC123"

Position 0: OrderPlaced      { orderId, userId, symbol, side, type, price, qty }
Position 1: OrderMatched      { matchedQty: 0.3, remainingQty: 0.2, tradeId }
Position 2: OrderMatched      { matchedQty: 0.2, remainingQty: 0.0, tradeId }
Position 3: OrderFilled       { totalFilledQty: 0.5 }
```

### 4.4 Outbox Pattern for Event Publishing

To ensure events are both stored AND published to Kafka atomically:

```sql
-- Outbox table (same database as event store)
CREATE TABLE event_outbox (
    id                BIGSERIAL PRIMARY KEY,
    event_id          UUID NOT NULL REFERENCES event_store(event_id),
    topic             VARCHAR(255) NOT NULL,
    partition_key     VARCHAR(255) NOT NULL,
    payload           JSONB NOT NULL,
    published         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at      TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unpublished ON event_outbox (published, created_at)
    WHERE published = FALSE;
```

**Flow:**
1. Write event to `event_store` + `event_outbox` in same transaction
2. Background poller reads unpublished outbox entries → publishes to Kafka → marks as published
3. Guarantees at-least-once delivery (consumers must be idempotent)

---

## 5. PostgreSQL Read Models

### 5.1 Order Read Model (Order Service DB)

```sql
-- Projected from order events
CREATE TABLE orders_read (
    order_id          UUID PRIMARY KEY,
    user_id           UUID NOT NULL,
    symbol            VARCHAR(20) NOT NULL,
    side              VARCHAR(4) NOT NULL,           -- BUY, SELL
    order_type        VARCHAR(10) NOT NULL,          -- MARKET, LIMIT
    price             DECIMAL(20,8),
    quantity          DECIMAL(20,8) NOT NULL,
    filled_quantity   DECIMAL(20,8) NOT NULL DEFAULT 0,
    remaining_quantity DECIMAL(20,8) NOT NULL,
    status            VARCHAR(20) NOT NULL,          -- PENDING, PARTIAL, FILLED, CANCELLED
    idempotency_key   VARCHAR(255) UNIQUE,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL,
    last_event_position BIGINT NOT NULL              -- track projection progress
);

CREATE INDEX idx_orders_user ON orders_read (user_id, created_at DESC);
CREATE INDEX idx_orders_symbol ON orders_read (symbol, status);
CREATE INDEX idx_orders_status ON orders_read (status) WHERE status IN ('PENDING', 'PARTIAL');

-- Trade history (projected from TradeExecuted events)
CREATE TABLE trades_read (
    trade_id          UUID PRIMARY KEY,
    buy_order_id      UUID NOT NULL,
    sell_order_id     UUID NOT NULL,
    buyer_id          UUID NOT NULL,
    seller_id         UUID NOT NULL,
    symbol            VARCHAR(20) NOT NULL,
    price             DECIMAL(20,8) NOT NULL,
    quantity          DECIMAL(20,8) NOT NULL,
    total             DECIMAL(20,8) NOT NULL,
    executed_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_trades_symbol ON trades_read (symbol, executed_at DESC);
CREATE INDEX idx_trades_buyer ON trades_read (buyer_id, executed_at DESC);
CREATE INDEX idx_trades_seller ON trades_read (seller_id, executed_at DESC);
```

### 5.2 Portfolio Read Model (Portfolio Service DB)

```sql
-- User balances
CREATE TABLE balances_read (
    user_id           UUID PRIMARY KEY,
    available_cash    DECIMAL(20,8) NOT NULL DEFAULT 0,
    reserved_cash     DECIMAL(20,8) NOT NULL DEFAULT 0,
    total_cash        DECIMAL(20,8) GENERATED ALWAYS AS (available_cash + reserved_cash) STORED,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_event_position BIGINT NOT NULL DEFAULT 0
);

-- User holdings per asset
CREATE TABLE holdings_read (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    symbol            VARCHAR(20) NOT NULL,
    quantity          DECIMAL(20,8) NOT NULL DEFAULT 0,
    avg_cost_basis    DECIMAL(20,8) NOT NULL DEFAULT 0,
    total_cost        DECIMAL(20,8) NOT NULL DEFAULT 0,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_symbol UNIQUE (user_id, symbol)
);

CREATE INDEX idx_holdings_user ON holdings_read (user_id);

-- Transaction ledger (append-only)
CREATE TABLE transactions_read (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    type              VARCHAR(20) NOT NULL,          -- DEPOSIT, WITHDRAWAL, BUY, SELL, RESERVE, RELEASE
    symbol            VARCHAR(20),
    quantity          DECIMAL(20,8),
    price             DECIMAL(20,8),
    cash_delta        DECIMAL(20,8) NOT NULL,
    reference_id      UUID,                          -- orderId or tradeId
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions_read (user_id, created_at DESC);

-- PnL summary (materialized, refreshed periodically)
CREATE MATERIALIZED VIEW pnl_summary AS
SELECT
    h.user_id,
    h.symbol,
    h.quantity,
    h.avg_cost_basis,
    h.total_cost,
    h.quantity * h.avg_cost_basis AS cost_value
FROM holdings_read h
WHERE h.quantity > 0;

CREATE UNIQUE INDEX idx_pnl_summary ON pnl_summary (user_id, symbol);
```

### 5.3 Market Data Read Model (Market Data Service DB)

```sql
-- Asset metadata
CREATE TABLE assets (
    symbol            VARCHAR(20) PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    asset_type        VARCHAR(10) NOT NULL,          -- STOCK, CRYPTO
    base_price        DECIMAL(20,8) NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- Price history (time-series optimized)
CREATE TABLE price_history (
    id                BIGSERIAL PRIMARY KEY,
    symbol            VARCHAR(20) NOT NULL,
    price             DECIMAL(20,8) NOT NULL,
    bid               DECIMAL(20,8) NOT NULL,
    ask               DECIMAL(20,8) NOT NULL,
    volume            DECIMAL(20,8) NOT NULL DEFAULT 0,
    timestamp         TIMESTAMPTZ NOT NULL
);

-- Partition by time range for efficient queries
CREATE INDEX idx_price_history_lookup ON price_history (symbol, timestamp DESC);

-- Candlestick data
CREATE TABLE candlesticks (
    id                BIGSERIAL PRIMARY KEY,
    symbol            VARCHAR(20) NOT NULL,
    interval          VARCHAR(5) NOT NULL,           -- 1m, 5m, 15m, 1h, 1d
    open_price        DECIMAL(20,8) NOT NULL,
    high_price        DECIMAL(20,8) NOT NULL,
    low_price         DECIMAL(20,8) NOT NULL,
    close_price       DECIMAL(20,8) NOT NULL,
    volume            DECIMAL(20,8) NOT NULL DEFAULT 0,
    open_time         TIMESTAMPTZ NOT NULL,
    close_time        TIMESTAMPTZ NOT NULL,

    CONSTRAINT uq_candle UNIQUE (symbol, interval, open_time)
);

CREATE INDEX idx_candles_lookup ON candlesticks (symbol, interval, open_time DESC);
```

### 5.4 Notification Read Model

```sql
CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    type              VARCHAR(50) NOT NULL,
    title             VARCHAR(255) NOT NULL,
    body              TEXT NOT NULL,
    data              JSONB DEFAULT '{}',
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;

CREATE TABLE price_alerts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    symbol            VARCHAR(20) NOT NULL,
    condition         VARCHAR(5) NOT NULL,           -- ABOVE, BELOW
    target_price      DECIMAL(20,8) NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    triggered_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_active ON price_alerts (symbol, is_active) WHERE is_active = TRUE;
```

### 5.5 Chat Read Model

```sql
CREATE TABLE chat_rooms (
    id                VARCHAR(50) PRIMARY KEY,       -- "global", "asset:BTC-USD"
    name              VARCHAR(100) NOT NULL,
    type              VARCHAR(20) NOT NULL,          -- GLOBAL, ASSET
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id           VARCHAR(50) NOT NULL REFERENCES chat_rooms(id),
    user_id           UUID NOT NULL,
    content           TEXT NOT NULL,
    is_moderated      BOOLEAN NOT NULL DEFAULT FALSE,
    moderation_result JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_room ON chat_messages (room_id, created_at DESC);
```

### 5.6 User/Auth Read Model

```sql
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) NOT NULL UNIQUE,
    username          VARCHAR(50) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    role              VARCHAR(20) NOT NULL DEFAULT 'TRADER',
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id),
    token_hash        VARCHAR(255) NOT NULL UNIQUE,
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
```

---

## 6. Redis Usage Strategy

### 6.1 Usage Categories

```
Redis Cluster
├── Cache Layer
│   ├── Price cache (latest prices per symbol)
│   ├── Order book cache (top N levels)
│   ├── Portfolio balance cache
│   └── User session cache
│
├── Real-time PubSub
│   ├── Price streaming channels
│   ├── Chat message fanout
│   ├── Notification push
│   └── Presence updates
│
├── Distributed Locking
│   ├── Order book segment locks (Redlock)
│   ├── Balance operation locks (per-user)
│   ├── Market data leader election
│   └── Idempotency key locks
│
├── Rate Limiting
│   ├── API rate limit counters (sliding window)
│   ├── Chat rate limit (per-user, per-room)
│   └── Order rate limit (per-user)
│
├── Job Queues (BullMQ)
│   ├── AI processing jobs
│   ├── Notification delivery jobs
│   ├── Event outbox relay jobs
│   └── Candlestick aggregation jobs
│
└── Data Structures
    ├── Sorted Sets: order book (price-time priority)
    ├── Sorted Sets: leaderboard (P&L ranking)
    ├── Sets: chat room members
    ├── Hashes: user presence state
    └── Streams: event buffering (optional)
```

### 6.2 Key Naming Convention

```
Prefix format: {service}:{entity}:{identifier}:{field}

Examples:
  market:price:BTC-USD                    → latest price JSON
  market:orderbook:BTC-USD:bids           → sorted set of bids
  market:orderbook:BTC-USD:asks           → sorted set of asks
  market:candle:BTC-USD:1m:current        → current building candle

  portfolio:balance:{userId}              → { available, reserved } hash
  portfolio:holdings:{userId}             → hash of symbol→quantity

  order:idempotency:{idempotencyKey}      → orderId (TTL: 24h)
  order:book:lock:{symbol}                → Redlock for order book

  chat:room:{roomId}:members              → set of userIds
  chat:presence:{userId}                  → { status, lastSeen } (TTL: 60s)

  ratelimit:api:{userId}:{endpoint}       → counter (TTL: window)
  ratelimit:chat:{userId}                 → counter (TTL: 10s)
  ratelimit:order:{userId}                → counter (TTL: 1s)

  lock:balance:{userId}                   → Redlock
  lock:market:leader                      → Leader election lock (TTL: 30s)
```

### 6.3 Cache Invalidation Strategy

| Cache Entry          | TTL     | Invalidation Trigger            | Pattern        |
|----------------------|---------|---------------------------------|----------------|
| Latest price         | 5s      | New price tick                  | Write-through  |
| Order book           | 1s      | Order placed/matched/cancelled  | Write-through  |
| Portfolio balance    | 30s     | Trade settled, fund reserved    | Write-behind   |
| User session         | 15m     | Explicit logout, token refresh  | TTL + explicit |
| Candlestick current  | 60s     | New price tick                  | Write-through  |

### 6.4 Redis Cluster Configuration

```
Production:
  - 6 nodes (3 masters + 3 replicas)
  - Separate clusters for cache vs PubSub vs locks
  - maxmemory-policy: allkeys-lru (cache cluster)
  - Persistence: RDB snapshots every 5 min (lock cluster only)

Development:
  - Single Redis instance
  - All purposes on same instance
```

---

## 7. Saga Orchestration vs Choreography

### 7.1 Decision Matrix

| Flow                           | Pattern          | Rationale                                              |
|--------------------------------|------------------|--------------------------------------------------------|
| Order Placement + Fund Reserve | **Orchestration**| Critical path, needs strict ordering, rollback clarity  |
| Trade Settlement               | **Orchestration**| Multi-service coordination, must be atomic              |
| Price Alert Trigger            | Choreography     | Simple, no rollback needed, fire-and-forget             |
| Chat Moderation                | Choreography     | Async, eventual consistency acceptable                  |
| Notification Delivery          | Choreography     | Independent, no coordination needed                     |

### 7.2 Order Placement Saga (Orchestrated)

```
OrderSagaOrchestrator (in Order Engine)
│
├── Step 1: Validate Order
│   ├── Success → Step 2
│   └── Fail → Reject Order (end)
│
├── Step 2: Reserve Funds (→ Portfolio Service)
│   ├── Command: ReserveFunds { userId, amount, orderId }
│   ├── Success (FundsReserved) → Step 3
│   └── Fail (InsufficientFunds) → Compensate: Reject Order
│
├── Step 3: Place on Order Book
│   ├── Append OrderPlaced event to Event Store
│   ├── Insert into in-memory order book
│   ├── Attempt match
│   │   ├── If matched → Step 4
│   │   └── If not matched → Order resting (saga paused until match)
│   └── Fail → Compensate: Release Funds → Reject Order
│
├── Step 4: Settle Trade (→ Portfolio Service)
│   ├── Command: SettleTrade { buyerId, sellerId, symbol, qty, price, tradeId }
│   ├── Success → Step 5
│   └── Fail → Compensate: Reverse match, Release funds (critical failure path)
│
└── Step 5: Publish TradeExecuted
    └── Kafka → Notification Service, Market Data update, etc.
```

### 7.3 Saga State Machine

```sql
-- Saga instance tracking
CREATE TABLE saga_instances (
    saga_id           UUID PRIMARY KEY,
    saga_type         VARCHAR(50) NOT NULL,
    current_step      VARCHAR(50) NOT NULL,
    status            VARCHAR(20) NOT NULL,          -- STARTED, COMPENSATING, COMPLETED, FAILED
    payload           JSONB NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ
);

CREATE TABLE saga_step_log (
    id                BIGSERIAL PRIMARY KEY,
    saga_id           UUID NOT NULL REFERENCES saga_instances(saga_id),
    step_name         VARCHAR(50) NOT NULL,
    action            VARCHAR(20) NOT NULL,          -- EXECUTE, COMPENSATE
    status            VARCHAR(20) NOT NULL,          -- SUCCESS, FAILED, TIMEOUT
    request_data      JSONB,
    response_data     JSONB,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.4 Compensation Logic

```
Compensation Chain (reverse order):
─────────────────────────────────────
Step 5 fail: No compensation needed (publish is retried)
Step 4 fail: Release buyer funds, restore seller holdings → Mark orders as failed
Step 3 fail: Release reserved funds → RejectOrder event
Step 2 fail: No prior state to compensate → RejectOrder event
Step 1 fail: No compensation needed

Key Rules:
├── Compensations are idempotent (can be safely retried)
├── Compensations use the same idempotency key with "comp-" prefix
├── Maximum 3 retry attempts before moving to dead letter
└── Human intervention alert on DLQ
```

---

## 8. WebSocket Gateway Architecture

### 8.1 Architecture

```
                    Load Balancer (sticky sessions by userId)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Gateway  │   │ Gateway  │   │ Gateway  │
        │ Pod 1    │   │ Pod 2    │   │ Pod 3    │
        │          │   │          │   │          │
        │ WS Conns │   │ WS Conns │   │ WS Conns │
        │ ~333     │   │ ~333     │   │ ~333     │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │               │               │
             └───────────────┼───────────────┘
                             │
                    Redis PubSub Cluster
                    (cross-pod fanout)
```

### 8.2 WebSocket Channels / Rooms

```
Channel Structure:
├── prices:{symbol}              # Real-time price ticks
│   └── e.g., prices:BTC-USD
│
├── orderbook:{symbol}           # Order book depth updates
│   └── e.g., orderbook:BTC-USD
│
├── user:{userId}:orders         # User's order updates (private)
├── user:{userId}:portfolio      # User's portfolio updates (private)
├── user:{userId}:notifications  # User's notifications (private)
│
├── chat:{roomId}                # Chat room messages
│   ├── chat:global
│   └── chat:asset:BTC-USD
│
├── chat:{roomId}:presence       # Typing indicators, online status
│
└── trades:{symbol}              # Recent trade feed
```

### 8.3 Connection Lifecycle

```
Client                          Gateway                       Redis
  │                               │                             │
  │── WS Connect ────────────────►│                             │
  │                               │── Verify JWT ──►            │
  │                               │◄── Valid ───────            │
  │                               │                             │
  │                               │── Register connection ─────►│
  │                               │   SET ws:conn:{userId} pod1 │
  │                               │                             │
  │── Subscribe("prices:BTC") ──►│                             │
  │                               │── SUBSCRIBE prices:BTC ────►│
  │                               │                             │
  │                               │◄── price update ────────────│
  │◄── { type: "price",          │                             │
  │      data: { BTC: 42150 } } ─│                             │
  │                               │                             │
  │── Heartbeat (30s) ──────────►│                             │
  │◄── Pong ─────────────────────│                             │
  │                               │                             │
  │── Disconnect ────────────────►│                             │
  │                               │── DEL ws:conn:{userId} ────►│
  │                               │── UNSUBSCRIBE all ─────────►│
```

### 8.4 NestJS WebSocket Gateway Implementation Strategy

```
@WebSocketGateway with Socket.IO adapter:
├── Authentication: Custom middleware validates JWT on handshake
├── Adapter: @nestjs/platform-socket.io with Redis adapter (socket.io-redis)
├── Namespaces:
│   ├── /prices    — Market data streaming
│   ├── /trading   — Order updates, portfolio (authenticated)
│   ├── /chat      — Chat messaging
│   └── /notify    — Notifications (authenticated)
├── Rooms: Dynamic join/leave based on subscriptions
├── Compression: per-message deflate enabled
├── Reconnection: Client-side exponential backoff (1s, 2s, 4s, 8s, max 30s)
└── Heartbeat: 30s interval, 10s timeout
```

### 8.5 Message Protocol

```typescript
// Client → Server
interface WsClientMessage {
  event: string;           // "subscribe" | "unsubscribe" | "chat:send" | "ping"
  data: {
    channel?: string;      // "prices:BTC-USD"
    payload?: unknown;
  };
  requestId: string;       // For request-reply correlation
}

// Server → Client
interface WsServerMessage {
  event: string;           // "price:update" | "order:update" | "chat:message" | "pong"
  data: unknown;
  channel: string;
  timestamp: number;
  requestId?: string;      // Echo back for request-reply
}
```

---

## 9. Kubernetes Deployment Strategy

### 9.1 Cluster Architecture

```
K8s Cluster
├── Namespace: mock-exchange-prod
│   ├── Deployments
│   │   ├── api-gateway          (3 replicas, HPA 3-10)
│   │   ├── market-data-service  (2 replicas, 1 writer + 1 reader)
│   │   ├── order-engine         (N replicas, 1 per asset partition)
│   │   ├── portfolio-service    (3 replicas, HPA 3-8)
│   │   ├── notification-service (2 replicas, HPA 2-5)
│   │   ├── chat-service         (3 replicas, HPA 3-8)
│   │   ├── ai-service           (2 replicas, HPA 2-6)
│   │   └── user-auth-service    (2 replicas, HPA 2-5)
│   │
│   ├── StatefulSets
│   │   ├── postgresql           (1 primary + 2 read replicas, PGBouncer sidecar)
│   │   ├── redis-cluster        (6 nodes: 3 masters + 3 replicas)
│   │   └── kafka-cluster        (3 brokers, Strimzi operator)
│   │
│   ├── Services
│   │   ├── ClusterIP for internal communication
│   │   └── LoadBalancer for api-gateway (external)
│   │
│   ├── Ingress (NGINX Ingress Controller)
│   │   ├── /api/*           → api-gateway
│   │   ├── /ws/*            → api-gateway (WebSocket upgrade)
│   │   └── /                → frontend (CDN/static)
│   │
│   ├── ConfigMaps & Secrets
│   │   ├── app-config        (non-sensitive config)
│   │   └── app-secrets       (sealed-secrets or external-secrets)
│   │
│   └── CronJobs
│       ├── candlestick-aggregator (every 1 min)
│       ├── pnl-snapshot           (every 5 min)
│       └── stale-order-cleanup    (every 1 hour)
│
├── Namespace: mock-exchange-monitoring
│   ├── Prometheus + Grafana       (metrics)
│   ├── Loki                       (logs)
│   ├── Tempo                      (distributed tracing)
│   └── AlertManager               (alerts)
│
└── Namespace: mock-exchange-staging
    └── (mirror of prod with fewer replicas)
```

### 9.2 Resource Requests & Limits

| Service              | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------------------|-------------|-----------|----------------|--------------|
| API Gateway          | 250m        | 500m      | 256Mi          | 512Mi        |
| Order Engine         | 500m        | 1000m     | 512Mi          | 1Gi          |
| Market Data Service  | 250m        | 500m      | 256Mi          | 512Mi        |
| Portfolio Service    | 250m        | 500m      | 256Mi          | 512Mi        |
| Notification Service | 100m        | 250m      | 128Mi          | 256Mi        |
| Chat Service         | 250m        | 500m      | 256Mi          | 512Mi        |
| AI Service           | 250m        | 500m      | 256Mi          | 512Mi        |
| PostgreSQL Primary   | 500m        | 2000m     | 1Gi            | 4Gi          |
| Redis Node           | 250m        | 500m      | 256Mi          | 1Gi          |
| Kafka Broker         | 500m        | 1000m     | 1Gi            | 2Gi          |

### 9.3 Health Checks

```yaml
# Per service:
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /health/startup
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 30        # Allow up to 2.5 min for startup
```

### 9.4 Helm Chart Structure

```
helm/
├── Chart.yaml
├── values.yaml                    # Default values
├── values-staging.yaml
├── values-production.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── api-gateway/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── ingress.yaml
│   ├── order-engine/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── ... (per service)
│   ├── infrastructure/
│   │   ├── postgresql.yaml
│   │   ├── redis.yaml
│   │   └── kafka.yaml
│   └── monitoring/
│       ├── prometheus-rules.yaml
│       └── grafana-dashboards.yaml
└── charts/                        # Sub-charts
    ├── postgresql/
    ├── redis/
    └── kafka/
```

---

## 10. CI/CD Pipeline Strategy

### 10.1 Pipeline Architecture

```
GitHub Repository (Monorepo)
         │
         ▼
┌─────────────────────────────────┐
│        GitHub Actions           │
├─────────────────────────────────┤
│                                 │
│  PR Pipeline (on pull_request): │
│  ├── Lint (ESLint, Prettier)    │
│  ├── Type Check (tsc)           │
│  ├── Unit Tests (Jest)          │
│  ├── Integration Tests          │
│  ├── Security Scan (Trivy)      │
│  └── Build Check                │
│                                 │
│  Main Pipeline (on merge):      │
│  ├── All PR checks              │
│  ├── Build Docker images        │
│  ├── Push to Container Registry │
│  ├── Deploy to Staging          │
│  ├── Run E2E Tests on Staging   │
│  ├── Manual approval gate       │
│  └── Deploy to Production       │
│                                 │
└─────────────────────────────────┘
```

### 10.2 Build Strategy (Monorepo)

```
Affected-based builds:
├── Use Turborepo or Nx for monorepo task orchestration
├── Only build/test services affected by changes
├── Shared libraries trigger builds for all dependent services
├── Docker layer caching for faster builds
└── Multi-stage Dockerfile per service

Docker Image Tags:
├── PR: ghcr.io/org/mock-exchange/{service}:pr-{number}
├── Staging: ghcr.io/org/mock-exchange/{service}:staging-{sha}
├── Production: ghcr.io/org/mock-exchange/{service}:v{semver}
└── Latest: ghcr.io/org/mock-exchange/{service}:latest
```

### 10.3 Deployment Strategy

```
Rolling Update (default):
├── maxSurge: 1
├── maxUnavailable: 0
└── Used for: All stateless services

Blue-Green (for critical path):
├── Order Engine: Full blue-green switchover
├── Reason: Zero-downtime for matching engine
└── Implemented via K8s service selector switch

Canary (optional for API Gateway):
├── Route 10% traffic to canary
├── Monitor error rates for 10 minutes
├── Promote or rollback
└── Implemented via Istio/NGINX canary annotations

Database Migrations:
├── Run as K8s Job before deployment
├── Forward-compatible migrations only
├── Never break previous version
└── Tool: Prisma Migrate
```

---

## 11. Scaling Bottlenecks

### 11.1 Identified Bottlenecks

| # | Bottleneck | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Order book per symbol is single-threaded** | Cannot parallelize matching for same symbol | Accept this trade-off; partition by symbol. One node per high-volume symbol. Low-volume symbols can share. |
| 2 | **PostgreSQL Event Store writes** | Event append throughput limited by single DB | Partition event store by stream prefix. Consider separate DB per service. Use connection pooling (PgBouncer). |
| 3 | **Kafka consumer lag** | Read model projections fall behind | Monitor consumer lag. Increase partitions + consumer instances. Use batch processing in projectors. |
| 4 | **Redis PubSub fan-out for prices** | High-frequency price updates to many subscribers | Throttle price updates (max 10/sec/symbol to WS). Use Redis Streams for buffering. Batch price updates. |
| 5 | **WebSocket connection limits** | Each pod has OS-level socket limits | Tune ulimits (65k per pod). Target ~5k connections per pod. Scale pods horizontally. |
| 6 | **PostgreSQL read model queries** | Portfolio reads under high trade volume | Aggressive Redis caching. Read replicas. Materialized views with periodic refresh. |
| 7 | **AI Service external API calls** | LLM API rate limits and latency | Job queue with concurrency limits. Response caching. Local model fallback for moderation. |
| 8 | **Balance reservation race conditions** | Concurrent orders for same user | Per-user Redis lock (Redlock) with 5s TTL. Optimistic locking on balance version. |

### 11.2 Scaling Tiers

```
Tier 1: 100 users (MVP)
├── Single instance per service
├── Single PostgreSQL
├── Single Redis
├── Single Kafka broker
└── ~$50/mo infrastructure

Tier 2: 1,000 users (Target)
├── 2-3 instances per service
├── PostgreSQL primary + 2 read replicas
├── Redis cluster (6 nodes)
├── Kafka (3 brokers)
└── ~$300/mo infrastructure

Tier 3: 10,000 users
├── 5-10 instances per stateless service
├── PostgreSQL per service (service-per-DB)
├── Dedicated Redis clusters per concern
├── Kafka (5+ brokers, more partitions)
└── ~$1,500/mo infrastructure

Tier 4: 100,000+ users
├── Sharded databases
├── Regional deployments
├── CDN for static + WebSocket edge
├── Dedicated matching engine nodes per top asset
└── ~$10,000+/mo infrastructure
```

---

## 12. Trade-offs in Detail

### 12.1 CAP Theorem Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAP Theorem Positioning                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Order Matching Engine:  CP (Consistency + Partition Tolerance)  │
│  ├── MUST be consistent: two orders can't match same liquidity  │
│  ├── During network partition: reject orders (fail closed)      │
│  └── Availability sacrificed: better to reject than mis-execute │
│                                                                 │
│  Portfolio Service:  CP (for writes) / AP (for reads)           │
│  ├── Write path: strong consistency (balance can't go negative) │
│  ├── Read path: eventual consistency acceptable                 │
│  └── Stale balance display OK; incorrect reservation NOT OK     │
│                                                                 │
│  Market Data Service:  AP (Availability + Partition Tolerance)  │
│  ├── Slightly stale prices acceptable                           │
│  ├── System should keep streaming even during partial failures  │
│  └── Last-known price is better than no price                   │
│                                                                 │
│  Chat Service:  AP                                              │
│  ├── Messages can be slightly delayed or out of order           │
│  ├── Chat should remain available even during failures          │
│  └── Eventual consistency is natural for messaging              │
│                                                                 │
│  Notification Service:  AP                                      │
│  ├── At-least-once delivery (better duplicate than missing)     │
│  ├── Delayed notification acceptable                            │
│  └── DLQ for persistent failures, manual retry                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Event Sourcing Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Complete audit trail of all order state changes | Increased storage requirements |
| Can replay events to rebuild state | Complexity in event versioning (upcasting) |
| Natural fit for CQRS read model projection | Eventually consistent read models |
| Time-travel debugging | Event schema evolution requires careful planning |
| Can add new projections retroactively | Snapshot management needed for long-lived aggregates |

### 12.3 CQRS Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Independent scaling of reads vs writes | Eventual consistency between write and read |
| Optimized read models per query pattern | More infrastructure (separate models, projectors) |
| Write model focuses on business rules | Complexity in keeping projections in sync |
| Read model can be denormalized freely | Need to handle projection failures and replay |

### 12.4 Microservices Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Independent deployment per service | Distributed system complexity |
| Team autonomy and parallel development | Network latency between services |
| Technology heterogeneity possible | Data consistency challenges |
| Fault isolation | Operational overhead (monitoring, debugging) |
| Horizontal scaling per service | Saga complexity for distributed transactions |

### 12.5 Saga Orchestration Trade-offs

| Orchestration (chosen for trading) | Choreography (chosen for notifications) |
|-------------------------------------|------------------------------------------|
| Centralized logic, easy to understand | Decoupled, no single point of control |
| Easier to implement compensation | Each service is more autonomous |
| Single point of failure (orchestrator) | Harder to track overall flow |
| Easier to test and debug | More resilient to individual failures |
| Better for complex multi-step flows | Better for simple event reactions |

### 12.6 Custom Event Store vs EventStoreDB

| Custom PostgreSQL Event Store (chosen) | EventStoreDB |
|----------------------------------------|-------------|
| Reuses existing PostgreSQL expertise | Purpose-built, optimized for event streams |
| Single database technology to manage | Additional operational burden |
| Flexible schema, JSONB for events | Built-in projections and subscriptions |
| Outbox pattern for Kafka publishing | Built-in pub/sub |
| Must implement subscriptions ourselves | Better performance for pure event workloads |
| Sufficient for mock trading scale | Better for very high event throughput |

---

## 13. Phased MVP to Enterprise Roadmap

### Phase 0: Foundation (Weeks 1-2)
```
Goals: Project scaffolding, infrastructure, CI/CD
├── Monorepo setup (Turborepo)
├── Docker Compose for local development
├── PostgreSQL, Redis, Kafka infrastructure
├── Shared libraries (event schemas, common DTOs)
├── CI pipeline (lint, test, build)
├── API Gateway with JWT auth skeleton
├── User/Auth service (register, login, refresh)
└── Deliverables: Running local stack, auth flow, health checks
```

### Phase 1: Core Trading MVP (Weeks 3-6)
```
Goals: Basic trading functionality
├── Market Data Service
│   ├── Simulated price engine (5-10 assets)
│   ├── WebSocket price streaming
│   └── Price history storage
├── Order Engine
│   ├── Event Store implementation
│   ├── Market orders only (simplified matching)
│   ├── Basic order book
│   └── Core domain events
├── Portfolio Service
│   ├── Balance management (deposit mock funds)
│   ├── Holdings tracking
│   ├── Basic CQRS projections
│   └── Fund reservation saga
├── Frontend
│   ├── Auth pages (login, register)
│   ├── Price ticker dashboard
│   ├── Simple order form
│   └── Portfolio view
└── Deliverables: Users can place market orders and see portfolio updates
```

### Phase 2: Advanced Trading (Weeks 7-10)
```
Goals: Full trading features, limit orders, real-time
├── Order Engine Enhancements
│   ├── Limit orders + price-time priority matching
│   ├── Partial fills
│   ├── Order cancellation
│   ├── Order modification
│   └── Snapshots for aggregate optimization
├── Market Data Enhancements
│   ├── Candlestick aggregation
│   ├── Order book depth visualization
│   ├── More assets (20+)
│   └── Realistic price simulation (volatility, trends)
├── Portfolio Enhancements
│   ├── P&L calculation (realized + unrealized)
│   ├── Transaction history
│   └── Leaderboard
├── Frontend
│   ├── Real-time order book display
│   ├── Candlestick chart (TradingView lightweight)
│   ├── Order history
│   └── P&L dashboard
└── Deliverables: Full trading experience with limit orders and charts
```

### Phase 3: Social & Notifications (Weeks 11-13)
```
Goals: Chat, notifications, community features
├── Chat Service
│   ├── Global chat
│   ├── Asset-specific rooms
│   ├── Presence tracking
│   └── Message history
├── Notification Service
│   ├── Trade execution alerts
│   ├── Order lifecycle notifications
│   ├── Price alerts
│   └── In-app notification center
├── Frontend
│   ├── Chat UI (side panel)
│   ├── Notification bell + dropdown
│   └── Price alert configuration
└── Deliverables: Social trading experience with real-time chat and alerts
```

### Phase 4: AI Features (Weeks 14-16)
```
Goals: AI-powered analysis and moderation
├── AI Service
│   ├── Trade suggestion bot
│   ├── Portfolio risk analysis
│   ├── Chat content moderation
│   └── BullMQ job processing
├── Frontend
│   ├── AI assistant panel
│   ├── Trade suggestions UI
│   └── Portfolio analysis view
└── Deliverables: AI-enhanced trading with moderation
```

### Phase 5: Production Hardening (Weeks 17-20)
```
Goals: Production readiness, observability, testing
├── Observability
│   ├── OpenTelemetry instrumentation (all services)
│   ├── Prometheus metrics + Grafana dashboards
│   ├── Distributed tracing (Tempo)
│   ├── Centralized logging (Loki)
│   └── AlertManager rules
├── Resilience
│   ├── Circuit breakers (all inter-service calls)
│   ├── Retry policies with exponential backoff
│   ├── Dead letter queue handling
│   ├── Graceful shutdown
│   └── Chaos testing
├── Security
│   ├── Rate limiting (per-user, per-endpoint)
│   ├── Input validation
│   ├── CSRF/XSS protection
│   ├── Secrets management (external-secrets)
│   └── Network policies
├── Performance
│   ├── Load testing (k6)
│   ├── Performance optimization
│   └── Database query optimization
├── Kubernetes
│   ├── Helm charts finalized
│   ├── HPA tuning
│   ├── Pod disruption budgets
│   └── Rolling deployment strategy
└── Deliverables: Production-grade, observable, resilient system
```

### Phase 6: Enterprise (Ongoing)
```
Goals: Scale, advanced features
├── Multi-region deployment
├── Advanced order types (stop-loss, OCO, trailing stop)
├── Paper trading competitions
├── Social features (follow traders, copy trading)
├── Mobile app (React Native)
├── Advanced AI (ML-based price predictions)
├── Admin dashboard
└── API for third-party integrations
```

---

## 14. Load Testing Strategy

### 14.1 Tool: k6 (Grafana k6)

```
Why k6:
├── JavaScript/TypeScript test scripts
├── Built-in WebSocket support
├── Excellent Kubernetes integration
├── Grafana integration for real-time dashboards
├── Distributed execution support
└── Cloud execution option
```

### 14.2 Test Scenarios

```
Scenario 1: Price Streaming Load
├── Target: 1,000 concurrent WebSocket connections
├── Each subscribes to 3-5 symbols
├── Measure: Message delivery latency, connection stability
├── Duration: 30 minutes sustained
├── Pass criteria: p99 latency < 100ms, 0 dropped connections

Scenario 2: Order Throughput
├── Target: 500 orders/second across all symbols
├── Mix: 60% market, 40% limit
├── Measure: Order acceptance latency, matching latency
├── Duration: 15 minutes sustained
├── Pass criteria: p99 order acceptance < 200ms, p99 match < 500ms

Scenario 3: Portfolio Queries Under Load
├── Target: 1,000 concurrent users querying portfolio
├── While 200 orders/second are executing
├── Measure: Query latency, read model staleness
├── Pass criteria: p99 query < 300ms, staleness < 2 seconds

Scenario 4: Chat Message Flood
├── Target: 100 messages/second across all rooms
├── 1,000 users in global room
├── Measure: Message delivery latency, ordering
├── Pass criteria: p99 delivery < 500ms

Scenario 5: Spike Test
├── Ramp: 100 → 2,000 users in 1 minute
├── Hold: 5 minutes
├── Ramp down: 2,000 → 100 in 1 minute
├── Measure: Auto-scaling behavior, error rates
├── Pass criteria: <1% error rate, HPA scales within 60s

Scenario 6: Soak Test
├── Target: 500 concurrent users
├── Duration: 4 hours
├── Measure: Memory leaks, connection leaks, DB connection pool exhaustion
├── Pass criteria: No memory growth > 20%, no connection pool saturation
```

### 14.3 Load Test Infrastructure

```
K8s CronJob / Manual Trigger:
├── k6 operator for Kubernetes
├── InfluxDB for k6 metrics
├── Grafana dashboard for real-time visualization
├── Test scripts in /tests/load/
├── Environment: dedicated load-test namespace
└── Runs against staging environment (never production)
```

---

## 15. Failure Simulation Strategy

### 15.1 Chaos Engineering Approach

```
Tool: Chaos Mesh (Kubernetes-native) or Litmus
```

### 15.2 Failure Scenarios

```
Category 1: Network Failures
├── Test: Kafka broker network partition
│   ├── Expected: Producers buffer, consumers reconnect, no data loss
│   └── Recovery: Automatic within 30s
├── Test: Redis cluster node failure
│   ├── Expected: Failover to replica, temporary cache miss
│   └── Recovery: Automatic within 10s
├── Test: Inter-service network latency injection (500ms)
│   ├── Expected: Circuit breaker opens, graceful degradation
│   └── Recovery: Circuit breaker half-open test after 30s
└── Test: DNS resolution failure
    ├── Expected: Cached connections survive, new connections fail gracefully
    └── Recovery: DNS cache refresh

Category 2: Service Failures
├── Test: Order Engine pod crash mid-saga
│   ├── Expected: Saga timeout triggers compensation
│   ├── Reserved funds released within 5 minutes
│   └── Verify: No phantom orders in read model
├── Test: Portfolio Service unavailable for 60s
│   ├── Expected: Fund reservation fails, orders rejected
│   ├── Existing portfolio reads served from cache
│   └── Recovery: Queued events processed when service recovers
├── Test: Market Data Service crash
│   ├── Expected: Last known prices served from Redis cache
│   ├── Trading paused if prices older than 30s
│   └── Recovery: Price streaming resumes, candlesticks gap-filled
└── Test: AI Service crash
    ├── Expected: Chat moderation delayed (queue builds up)
    ├── Trade suggestions unavailable (graceful UI)
    └── Recovery: BullMQ jobs processed on restart

Category 3: Data Store Failures
├── Test: PostgreSQL primary failover
│   ├── Expected: Automatic failover to standby (patroni/stolon)
│   ├── Brief write unavailability (< 30s)
│   └── Read replicas continue serving reads
├── Test: Redis memory pressure (maxmemory reached)
│   ├── Expected: LRU eviction, cache misses fall through to DB
│   └── Monitoring alert triggered
└── Test: Kafka broker failure (1 of 3)
    ├── Expected: Partition leadership rebalance
    ├── Producers retry, consumers rebalance
    └── No message loss (replication factor = 3)

Category 4: Resource Exhaustion
├── Test: CPU throttling on Order Engine
│   ├── Expected: HPA scales up, latency increases temporarily
│   └── Orders queue but are not lost
├── Test: Memory pressure on Portfolio Service
│   ├── Expected: OOM kill → K8s restarts pod
│   └── Events replayed from last checkpoint
└── Test: DB connection pool exhaustion
    ├── Expected: New requests queued, timeout after 5s
    ├── PgBouncer helps manage connections
    └── Alert triggered for DBA intervention
```

### 15.3 Game Day Protocol

```
1. Schedule: Monthly chaos game days
2. Scope: One failure category per session
3. Runbook: Each failure has a documented expected behavior
4. Monitoring: All dashboards visible during test
5. Kill switch: Ability to immediately stop chaos experiment
6. Post-mortem: Document findings, create improvement tickets
```

---

## 16. Local Development Docker Compose

### 16.1 Docker Compose Design

```yaml
# docker-compose.yml structure (services overview):

Infrastructure:
  postgres:         PostgreSQL 16 (port 5432)
  redis:            Redis 7 (port 6379)
  kafka:            Kafka (KRaft mode, no Zookeeper) (port 9092)
  kafka-ui:         Kafka UI for debugging (port 8080)

Application Services:
  api-gateway:      NestJS (port 3000)
  market-data:      NestJS (port 3001)
  order-engine:     NestJS (port 3002)
  portfolio:        NestJS (port 3003)
  notification:     NestJS (port 3004)
  chat:             NestJS (port 3005)
  ai-service:       NestJS (port 3006)
  user-auth:        NestJS (port 3007)

Frontend:
  web:              Next.js (port 4000)

Monitoring (optional profile):
  prometheus:       Prometheus (port 9090)
  grafana:          Grafana (port 3100)
  jaeger:           Jaeger (port 16686)

Development Tools:
  pgadmin:          PgAdmin (port 5050)
  redis-commander:  Redis Commander (port 8081)
  mailhog:          MailHog for email testing (port 8025)
```

### 16.2 Development Workflow

```
# Start infrastructure only
docker compose up -d postgres redis kafka

# Run services locally (hot reload)
cd services/api-gateway && pnpm dev
cd services/order-engine && pnpm dev
...

# OR start everything in containers
docker compose --profile all up -d

# Start with monitoring
docker compose --profile all --profile monitoring up -d

# Database migrations
docker compose exec api-gateway pnpm prisma migrate dev

# Seed data
docker compose exec api-gateway pnpm seed

# View logs
docker compose logs -f order-engine

# Reset everything
docker compose down -v
```

### 16.3 Environment Variables

```
Shared .env file at project root:
├── DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mockexchange
├── REDIS_URL=redis://localhost:6379
├── KAFKA_BROKERS=localhost:9092
├── JWT_SECRET=dev-secret-change-in-production
├── JWT_EXPIRY=15m
├── REFRESH_TOKEN_EXPIRY=7d
├── AI_API_KEY=sk-... (optional for dev)
├── NODE_ENV=development
└── LOG_LEVEL=debug
```

---

## 17. Folder Structure

```
/Users/dohee/Documents/workspace/mock-exchange/
│
├── README.md
├── ARCHITECTURE.md                  # This document
├── LICENSE
├── .gitignore
├── .env.example
├── .env                             # Local dev (gitignored)
├── docker-compose.yml
├── docker-compose.override.yml      # Local overrides (gitignored)
├── turbo.json                       # Turborepo config
├── package.json                     # Root workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json               # Shared TypeScript config
├── .eslintrc.js                     # Shared ESLint config
├── .prettierrc                      # Shared Prettier config
│
├── packages/                        # Shared libraries
│   ├── common/                      # Shared types, utilities
│   │   ├── src/
│   │   │   ├── events/              # Event type definitions (CloudEvents)
│   │   │   │   ├── order.events.ts
│   │   │   │   ├── trade.events.ts
│   │   │   │   ├── portfolio.events.ts
│   │   │   │   ├── market.events.ts
│   │   │   │   └── index.ts
│   │   │   ├── dto/                 # Shared DTOs
│   │   │   │   ├── order.dto.ts
│   │   │   │   ├── portfolio.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── interfaces/          # Shared interfaces
│   │   │   ├── constants/           # Shared constants
│   │   │   ├── utils/               # Shared utilities
│   │   │   │   ├── idempotency.ts
│   │   │   │   ├── money.ts         # Decimal math helpers
│   │   │   │   └── correlation.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── event-store/                 # Event store library
│   │   ├── src/
│   │   │   ├── event-store.module.ts
│   │   │   ├── event-store.service.ts
│   │   │   ├── aggregate-root.base.ts
│   │   │   ├── event-publisher.ts
│   │   │   ├── outbox-relay.ts
│   │   │   └── interfaces/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── saga/                        # Saga framework
│   │   ├── src/
│   │   │   ├── saga-orchestrator.base.ts
│   │   │   ├── saga-step.interface.ts
│   │   │   ├── saga-state-machine.ts
│   │   │   └── saga.module.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── observability/               # OpenTelemetry setup
│       ├── src/
│       │   ├── tracing.ts
│       │   ├── metrics.ts
│       │   ├── logging.ts
│       │   └── observability.module.ts
│       ├── package.json
│       └── tsconfig.json
│
├── services/                        # Microservices
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   │   └── configuration.ts
│   │   │   ├── auth/                # JWT validation, guards
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── decorators/
│   │   │   │       └── current-user.decorator.ts
│   │   │   ├── gateway/             # WebSocket gateway
│   │   │   │   ├── ws.gateway.ts
│   │   │   │   ├── ws.adapter.ts
│   │   │   │   └── ws-auth.middleware.ts
│   │   │   ├── rate-limit/
│   │   │   │   ├── rate-limit.guard.ts
│   │   │   │   └── rate-limit.module.ts
│   │   │   ├── proxy/               # HTTP proxy to services
│   │   │   │   ├── order.proxy.ts
│   │   │   │   ├── portfolio.proxy.ts
│   │   │   │   └── market.proxy.ts
│   │   │   └── health/
│   │   │       └── health.controller.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── user-auth/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── domain/              # Clean Architecture: Domain
│   │   │   │   ├── entities/
│   │   │   │   │   └── user.entity.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── user.repository.interface.ts
│   │   │   │   └── value-objects/
│   │   │   │       └── email.vo.ts
│   │   │   ├── application/         # Clean Architecture: Application
│   │   │   │   ├── commands/
│   │   │   │   │   ├── register-user.command.ts
│   │   │   │   │   └── register-user.handler.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get-user.query.ts
│   │   │   │   │   └── get-user.handler.ts
│   │   │   │   └── services/
│   │   │   │       └── auth.service.ts
│   │   │   ├── infrastructure/      # Clean Architecture: Infrastructure
│   │   │   │   ├── persistence/
│   │   │   │   │   ├── prisma/
│   │   │   │   │   │   └── user.repository.ts
│   │   │   │   │   └── prisma.module.ts
│   │   │   │   └── config/
│   │   │   │       └── auth.config.ts
│   │   │   └── presentation/        # Clean Architecture: Presentation
│   │   │       ├── controllers/
│   │   │       │   └── auth.controller.ts
│   │   │       └── dto/
│   │   │           ├── register.dto.ts
│   │   │           └── login.dto.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── market-data/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── asset.entity.ts
│   │   │   │   │   └── price-tick.entity.ts
│   │   │   │   └── services/
│   │   │   │       └── price-engine.service.ts   # Simulation logic
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   └── start-simulation.handler.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get-price.handler.ts
│   │   │   │   │   └── get-candlesticks.handler.ts
│   │   │   │   └── services/
│   │   │   │       └── candlestick-aggregator.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/
│   │   │   │   │   └── price.repository.ts
│   │   │   │   ├── kafka/
│   │   │   │   │   └── price-producer.ts
│   │   │   │   └── redis/
│   │   │   │       └── price-cache.ts
│   │   │   └── presentation/
│   │   │       └── controllers/
│   │   │           └── market.controller.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── order-engine/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── domain/
│   │   │   │   ├── aggregates/
│   │   │   │   │   └── order.aggregate.ts        # Event-sourced aggregate
│   │   │   │   ├── entities/
│   │   │   │   │   └── trade.entity.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── order-id.vo.ts
│   │   │   │   │   ├── money.vo.ts
│   │   │   │   │   └── quantity.vo.ts
│   │   │   │   ├── events/
│   │   │   │   │   ├── order-placed.event.ts
│   │   │   │   │   ├── order-matched.event.ts
│   │   │   │   │   ├── order-cancelled.event.ts
│   │   │   │   │   └── trade-executed.event.ts
│   │   │   │   └── services/
│   │   │   │       └── matching-engine.service.ts # Core matching algorithm
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── place-order.command.ts
│   │   │   │   │   ├── place-order.handler.ts
│   │   │   │   │   ├── cancel-order.command.ts
│   │   │   │   │   └── cancel-order.handler.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get-order-book.handler.ts
│   │   │   │   │   └── get-user-orders.handler.ts
│   │   │   │   ├── sagas/
│   │   │   │   │   └── order-placement.saga.ts
│   │   │   │   └── projectors/
│   │   │   │       ├── order-read-model.projector.ts
│   │   │   │       └── trade-read-model.projector.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── event-store/
│   │   │   │   │   └── order-event-store.repository.ts
│   │   │   │   ├── persistence/
│   │   │   │   │   └── order-read.repository.ts
│   │   │   │   ├── kafka/
│   │   │   │   │   ├── order-event-producer.ts
│   │   │   │   │   └── market-price-consumer.ts
│   │   │   │   └── redis/
│   │   │   │       ├── order-book-cache.ts
│   │   │   │       └── order-lock.ts
│   │   │   └── presentation/
│   │   │       └── controllers/
│   │   │           └── order.controller.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── portfolio/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── account.entity.ts
│   │   │   │   │   └── holding.entity.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── balance.service.ts
│   │   │   │   └── repositories/
│   │   │   │       └── account.repository.interface.ts
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── reserve-funds.handler.ts
│   │   │   │   │   ├── release-funds.handler.ts
│   │   │   │   │   └── settle-trade.handler.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get-balance.handler.ts
│   │   │   │   │   ├── get-holdings.handler.ts
│   │   │   │   │   └── get-pnl.handler.ts
│   │   │   │   └── projectors/
│   │   │   │       ├── balance.projector.ts
│   │   │   │       └── holdings.projector.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/
│   │   │   │   ├── kafka/
│   │   │   │   └── redis/
│   │   │   └── presentation/
│   │   │       └── controllers/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── notification/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   │   ├── consumers/
│   │   │   │   │   ├── trade-event.consumer.ts
│   │   │   │   │   └── price-alert.consumer.ts
│   │   │   │   └── services/
│   │   │   │       └── notification-dispatcher.ts
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── chat/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ai-service/
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── domain/
│       │   ├── application/
│       │   │   ├── workers/
│       │   │   │   ├── trade-suggestion.worker.ts
│       │   │   │   ├── portfolio-analysis.worker.ts
│       │   │   │   └── moderation.worker.ts
│       │   │   └── services/
│       │   │       └── llm.service.ts
│       │   ├── infrastructure/
│       │   └── presentation/
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── apps/                            # Frontend applications
│   └── web/
│       ├── src/
│       │   ├── app/                 # Next.js App Router
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── (auth)/
│       │   │   │   ├── login/page.tsx
│       │   │   │   └── register/page.tsx
│       │   │   ├── dashboard/
│       │   │   │   ├── page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── trade/
│       │   │   │   └── [symbol]/page.tsx
│       │   │   ├── portfolio/
│       │   │   │   └── page.tsx
│       │   │   └── chat/
│       │   │       └── page.tsx
│       │   ├── components/
│       │   │   ├── ui/              # Shared UI components
│       │   │   ├── charts/          # TradingView, candlestick
│       │   │   ├── order/           # Order form, book display
│       │   │   ├── portfolio/       # Holdings, P&L
│       │   │   ├── chat/            # Chat panel
│       │   │   └── notification/    # Notification bell
│       │   ├── hooks/
│       │   │   ├── useWebSocket.ts
│       │   │   ├── usePrices.ts
│       │   │   └── useAuth.ts
│       │   ├── stores/              # Zustand stores
│       │   │   ├── auth.store.ts
│       │   │   ├── price.store.ts
│       │   │   └── ui.store.ts
│       │   ├── lib/
│       │   │   ├── api-client.ts    # Axios instance
│       │   │   └── ws-client.ts     # Socket.IO client
│       │   └── types/
│       ├── public/
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/                  # Infrastructure configs
│   ├── docker/
│   │   ├── postgres/
│   │   │   └── init.sql             # DB initialization
│   │   ├── kafka/
│   │   │   └── create-topics.sh
│   │   └── redis/
│   │       └── redis.conf
│   ├── k8s/                         # Raw K8s manifests (optional)
│   │   └── base/
│   └── helm/                        # Helm charts
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-staging.yaml
│       ├── values-production.yaml
│       └── templates/
│           ├── _helpers.tpl
│           ├── api-gateway/
│           ├── order-engine/
│           ├── market-data/
│           ├── portfolio/
│           ├── notification/
│           ├── chat/
│           ├── ai-service/
│           ├── user-auth/
│           └── infrastructure/
│
├── scripts/                         # Development & operations scripts
│   ├── seed.ts                      # Database seeder
│   ├── create-topics.sh             # Kafka topic creation
│   ├── migrate-all.sh               # Run all service migrations
│   └── dev-setup.sh                 # First-time dev setup
│
├── tests/                           # Cross-service tests
│   ├── e2e/
│   │   ├── trading-flow.e2e.ts
│   │   ├── order-saga.e2e.ts
│   │   └── setup.ts
│   ├── load/
│   │   ├── k6/
│   │   │   ├── price-streaming.js
│   │   │   ├── order-throughput.js
│   │   │   └── portfolio-query.js
│   │   └── k6.config.js
│   └── chaos/
│       ├── network-partition.yaml   # Chaos Mesh experiments
│       ├── pod-kill.yaml
│       └── resource-stress.yaml
│
├── docs/                            # Documentation
│   ├── adr/                         # Architecture Decision Records
│   │   ├── 001-monorepo-structure.md
│   │   ├── 002-event-store-choice.md
│   │   ├── 003-saga-pattern-choice.md
│   │   └── 004-cqrs-separation.md
│   ├── api/                         # API documentation
│   │   └── openapi.yaml
│   ├── runbooks/                    # Operational runbooks
│   │   ├── incident-response.md
│   │   └── deployment.md
│   └── diagrams/                    # Architecture diagrams
│       ├── system-context.puml
│       ├── event-flow.puml
│       └── deployment.puml
│
└── .github/
    └── workflows/
        ├── ci.yml                   # PR pipeline
        ├── cd-staging.yml           # Deploy to staging
        └── cd-production.yml        # Deploy to production
```

---

## Non-Functional Implementation Details

### Idempotency Strategy

```
All write operations include idempotency keys:
├── Client generates UUID idempotency key per request
├── Redis: SET idempotency:{key} {result} EX 86400 NX
│   ├── If SET succeeds → process request
│   └── If SET fails → return cached result
├── Event Store: event_id UUID column prevents duplicate events
└── Kafka: producer enable.idempotence=true
```

### Dead Letter Queue Strategy

```
DLQ Flow:
├── Consumer fails to process message
├── Retry 3 times with exponential backoff (1s, 5s, 25s)
├── After 3 failures → publish to dlq.{original-topic}
├── DLQ consumer:
│   ├── Logs failure details
│   ├── Stores in PostgreSQL dlq_messages table
│   └── Triggers alert to operations team
├── Manual retry: Admin API endpoint to replay DLQ messages
└── DLQ retention: 30 days
```

### Rate Limiting Strategy

```
Tier-based rate limiting:
├── Anonymous:    10 req/min
├── Authenticated: 100 req/min (general), 30 orders/min, 60 chat msgs/min
├── Premium:      300 req/min
└── Implementation: Redis sliding window (ZADD + ZRANGEBYSCORE + ZREMRANGEBYSCORE)

Per-endpoint limits:
├── POST /orders:        30/min per user
├── GET  /prices:        120/min per user
├── POST /chat/messages: 60/min per user
├── POST /auth/login:    5/min per IP (brute-force protection)
└── ALL endpoints:       1000/min per IP
```

### Security Considerations

```
Authentication & Authorization:
├── JWT access tokens (15 min TTL, RS256)
├── Refresh tokens (7 day TTL, httpOnly secure cookie)
├── RBAC: TRADER, MODERATOR, ADMIN roles
└── Per-service JWT validation (no shared secret, public key distribution)

Input Validation:
├── class-validator on all DTOs
├── Decimal.js for financial calculations (no floating point)
├── SQL injection prevention via Prisma parameterized queries
└── XSS prevention via Next.js built-in escaping

Infrastructure Security:
├── K8s Network Policies (service-to-service isolation)
├── Secrets via external-secrets-operator (AWS Secrets Manager / Vault)
├── Container image scanning (Trivy)
├── Non-root containers
└── Pod Security Standards (restricted)

API Security:
├── CORS whitelist
├── Helmet headers
├── Request size limits (1MB)
├── WebSocket origin validation
└── Rate limiting (see above)
```

### Observability Stack

```
Metrics (Prometheus + Grafana):
├── Service-level: request rate, error rate, latency (RED metrics)
├── Business-level: orders/sec, trades/sec, active users, WS connections
├── Infrastructure: CPU, memory, disk, network
└── Custom: Kafka consumer lag, event store size, cache hit ratio

Logging (Loki):
├── Structured JSON logs (pino)
├── Correlation ID propagation across services
├── Log levels: error, warn, info, debug
└── Retention: 30 days

Tracing (Tempo via OpenTelemetry):
├── Automatic HTTP/gRPC/Kafka span propagation
├── Custom spans for business operations
├── Trace sampling: 10% in production, 100% in staging
└── Trace retention: 7 days

Alerting (AlertManager):
├── P99 latency > 1s for 5 min → warning
├── Error rate > 5% for 2 min → critical
├── Kafka consumer lag > 10,000 → warning
├── Pod restart count > 3 in 10 min → critical
└── DLQ message count > 0 → warning
```
