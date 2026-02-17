# Mock Exchange - Real-Time Trading Platform

Production-grade, real-time mock stock/crypto trading platform built with microservices architecture.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS (TypeScript) |
| Frontend | Next.js (planned) |
| Database | PostgreSQL 16 (Database-per-Service) |
| Cache | Redis 7 |
| Message Broker | Apache Kafka (KRaft) |
| ORM | Prisma |
| Monorepo | Turborepo + pnpm |
| Container | Docker Compose |

## Architecture

```
                    +-----------------+
                    |   API Gateway   |  :3000
                    |  (JWT + Proxy)  |
                    +--------+--------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v------+  +---------v-------+  +--------v--------+
| User/Auth     |  | Market Data     |  | Order Engine     |
| :3007         |  | :3001           |  | :3002            |
| - Register    |  | - GBM Engine    |  | - Event Sourcing |
| - Login/JWT   |  | - Price Cache   |  | - Matching Engine|
| - Token Mgmt  |  | - Candlesticks  |  | - CQRS Read Model|
+---------------+  +-----------------+  +--------+--------+
                                                  |
                                         +--------v--------+
                                         | Portfolio        |
                                         | :3003            |
                                         | - Balance Mgmt   |
                                         | - Holdings       |
                                         | - Settlement     |
                                         +-----------------+
```

## Project Structure

```
mock-exchange/
├── packages/                   # Shared libraries
│   ├── common/                 # Constants, DTOs, events, utils
│   └── event-store/            # PostgreSQL Event Store + AggregateRoot
├── services/                   # Microservices
│   ├── api-gateway/            # API Gateway (JWT, rate limiting, proxy)
│   ├── user-auth/              # Authentication & authorization
│   ├── market-data/            # Price simulation & market feeds
│   ├── order-engine/           # Order matching (Event Sourcing + CQRS)
│   ├── portfolio/              # Balance, holdings, settlement
│   ├── notification/           # Notification service (skeleton)
│   ├── chat/                   # Chat service (skeleton)
│   └── ai-service/             # AI service (skeleton)
├── apps/                       # Frontend applications (planned)
├── infrastructure/             # Docker, Kafka scripts, Prometheus
├── scripts/                    # Dev setup, migration, seed scripts
├── docker-compose.yml          # PostgreSQL, Redis, Kafka
└── ARCHITECTURE.md             # Full system design document
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Setup

```bash
# 1. Clone & install
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Start infrastructure
docker compose up -d

# 4. Generate Prisma clients
pnpm -r run db:generate

# 5. Run migrations
pnpm -r run db:migrate

# 6. Build all packages
pnpm build

# 7. Start services (in separate terminals)
pnpm --filter @mock-exchange/market-data dev
pnpm --filter @mock-exchange/order-engine dev
pnpm --filter @mock-exchange/portfolio dev
pnpm --filter @mock-exchange/user-auth dev
pnpm --filter @mock-exchange/api-gateway dev
```

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/auth/logout` | Cookie | Logout, revoke tokens |
| GET | `/api/auth/me` | JWT | Get current user |

### Market Data (`/api/market`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/market/assets` | No | List all assets |
| GET | `/api/market/prices` | No | All latest prices |
| GET | `/api/market/prices/:symbol` | No | Price for symbol |
| GET | `/api/market/prices/:symbol/history` | No | Price history |
| GET | `/api/market/prices/:symbol/candlesticks` | No | Candlestick data |

### Orders (`/api/orders`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | JWT | Place new order |
| GET | `/api/orders` | JWT | List user orders |
| GET | `/api/orders/:orderId` | JWT | Get order detail |
| DELETE | `/api/orders/:orderId` | JWT | Cancel order |
| GET | `/api/orders/trades/history` | JWT | Trade history |
| GET | `/api/orders/book/:symbol` | No | Order book depth |

### Portfolio (`/api/portfolio`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/portfolio/deposit` | JWT | Deposit funds |
| GET | `/api/portfolio/balance` | JWT | Cash balance |
| GET | `/api/portfolio/holdings` | JWT | Asset holdings |
| GET | `/api/portfolio/summary` | JWT | Full portfolio |
| GET | `/api/portfolio/transactions` | JWT | Transaction history |

## Service Ports

| Service | Port |
|---------|------|
| API Gateway | 3000 |
| Market Data | 3001 |
| Order Engine | 3002 |
| Portfolio | 3003 |
| Notification | 3004 |
| Chat | 3005 |
| AI Service | 3006 |
| User/Auth | 3007 |

## Key Design Patterns

- **Event Sourcing**: Order Engine stores all state changes as immutable events
- **CQRS**: Separate write (Event Store) and read (PostgreSQL projections) models
- **Database-per-Service**: Each microservice owns its database schema
- **API Gateway Pattern**: Centralized JWT validation, rate limiting, routing
- **Saga Pattern**: Order placement orchestrates across Order Engine and Portfolio

## Development Phases

- [x] **Phase 0**: Foundation (monorepo, Docker, shared packages, auth, gateway, CI)
- [x] **Phase 1**: Core Trading MVP (market data, order engine, portfolio, gateway wiring)
- [ ] **Phase 2**: Advanced Trading (limit orders, charts, P&L, WebSocket streaming)
- [ ] **Phase 3**: Social Features (chat, notifications)
- [ ] **Phase 4**: AI Integration (trading signals, portfolio analysis)
- [ ] **Phase 5**: Production Hardening (K8s, observability, load testing)

## License

Private - All rights reserved.
