# Mock Exchange - 실시간 모의 거래 플랫폼

프로덕션 수준의 실시간 모의 주식/암호화폐 거래 플랫폼입니다. 마이크로서비스 아키텍처 기반으로 설계되었습니다.

## 기술 스택

| 계층 | 기술 |
|------|------|
| 백엔드 | NestJS (TypeScript) |
| 프론트엔드 | Next.js 15 (App Router) |
| 데이터베이스 | PostgreSQL 16 (서비스별 독립 DB) |
| 캐시 | Redis 7 |
| 메시지 브로커 | Apache Kafka (KRaft 모드) |
| ORM | Prisma |
| 모노레포 | Turborepo + pnpm |
| 컨테이너 | Docker Compose |

## 시스템 아키텍처

```
+-----------------+
|   Frontend      |  :4000
| (Next.js 15)    |
+--------+--------+
         |
+--------v--------+
|   API Gateway   |  :3000
| (JWT + 프록시)  |
+--------+--------+
         |
         +-------------------+-------------------+
         |                   |                   |
+--------v------+  +---------v-------+  +--------v--------+
| User/Auth     |  | Market Data     |  | Order Engine     |
| :3007         |  | :3001           |  | :3002            |
| - 회원가입    |  | - Yahoo Finance |  | - 이벤트 소싱    |
| - 로그인/JWT  |  | - 가격 캐시     |  | - 매칭 엔진      |
| - 관리자 기능 |  | - 캔들스틱      |  | - CQRS 읽기 모델 |
+---------------+  +-----------------+  +--------+--------+
                                                 |
                                        +--------v--------+
                                        | Portfolio        |
                                        | :3003            |
                                        | - 잔고 관리      |
                                        | - 보유 자산      |
                                        | - 관심종목       |
                                        +-----------------+
```

## 프로젝트 구조

```
mock-exchange/
├── backend/
│   ├── packages/                 # 공유 라이브러리
│   │   ├── common/               # 상수, DTO, 이벤트 타입, 유틸리티
│   │   └── event-store/          # PostgreSQL 이벤트 스토어 + AggregateRoot 베이스
│   └── services/                 # 마이크로서비스
│       ├── api-gateway/          # API Gateway (JWT 인증, 레이트 리미팅, 프록시)
│       ├── user-auth/            # 사용자 인증, 권한 관리, 관리자 기능
│       ├── market-data/          # Yahoo Finance 가격 데이터, 캔들스틱, 뉴스
│       ├── order-engine/         # 주문 매칭 (이벤트 소싱 + CQRS)
│       ├── portfolio/            # 잔고, 보유 자산, 관심종목, 거래 정산
│       ├── notification/         # 알림 서비스 (스켈레톤)
│       ├── chat/                 # 채팅 서비스 (스켈레톤)
│       └── ai-service/           # AI 서비스 (스켈레톤)
├── frontend/                     # Next.js 15 프론트엔드 (App Router)
│   ├── src/app/                  # 페이지 라우트
│   ├── src/components/           # UI 컴포넌트
│   ├── src/hooks/                # 커스텀 훅 (TanStack Query)
│   ├── src/stores/               # Zustand 상태 관리
│   └── src/lib/                  # API 클라이언트, i18n, 유틸리티
├── infrastructure/               # Docker, Kafka 스크립트, Prometheus
├── scripts/                      # 개발 환경 설정, 실행 스크립트
├── docker-compose.yml            # PostgreSQL, Redis, Kafka
└── docs/                         # 문서 (로컬 실행 가이드 등)
```

## 시작하기

### 사전 요구사항

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### 설치 및 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 파일 복사
cp .env.example .env

# 3. 인프라 실행 (PostgreSQL, Redis, Kafka)
docker compose up -d

# 4. Prisma 클라이언트 생성 (각 서비스별)
cd services/user-auth && npx prisma generate && cd ../..
cd services/market-data && npx prisma generate && cd ../..
cd services/order-engine && npx prisma generate && cd ../..
cd services/portfolio && npx prisma generate && cd ../..

# 5. 데이터베이스 마이그레이션
cd services/user-auth && npx prisma db push && cd ../..
cd services/market-data && npx prisma db push && cd ../..
cd services/order-engine && npx prisma db push && cd ../..
cd services/portfolio && npx prisma db push && cd ../..

# 6. 전체 빌드
pnpm turbo build

# 7. 전체 서비스 실행 (백엔드 5개 + 프론트엔드)
bash scripts/start-all.sh
```

### API 테스트 예시 (curl)

```bash
# 회원가입
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "Password123!", "nickname": "trader1"}'

# 로그인 (accessToken 반환)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "Password123!"}'

# 실시간 가격 조회 (인증 불필요)
curl http://localhost:3000/api/market/prices

# 특정 자산 가격 조회
curl http://localhost:3000/api/market/prices/BTC-USD

# 입금 (JWT 토큰 필요)
curl -X POST http://localhost:3000/api/portfolio/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"amount": "1000000"}'

# 시장가 매수 주문
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"symbol": "BTC-USD", "side": "BUY", "type": "MARKET", "quantity": "0.1", "idempotencyKey": "unique-key-1"}'

# 포트폴리오 요약 조회
curl http://localhost:3000/api/portfolio/summary \
  -H "Authorization: Bearer {accessToken}"

# 실시간 P&L 포트폴리오 평가
curl http://localhost:3000/api/portfolio/valuation \
  -H "Authorization: Bearer {accessToken}"
```

## API 엔드포인트

### 인증 (`/api/auth`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| POST | `/api/auth/register` | 불필요 | 회원가입 |
| POST | `/api/auth/login` | 불필요 | 로그인, JWT 토큰 반환 |
| POST | `/api/auth/refresh` | 쿠키 | 액세스 토큰 갱신 |
| POST | `/api/auth/logout` | 쿠키 | 로그아웃, 토큰 폐기 |
| GET | `/api/auth/me` | JWT | 현재 사용자 정보 조회 |

### 시장 데이터 (`/api/market`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/market/assets` | 불필요 | 전체 자산 목록 |
| GET | `/api/market/prices` | 불필요 | 전체 최신 가격 |
| GET | `/api/market/prices/:symbol` | 불필요 | 특정 자산 가격 |
| GET | `/api/market/prices/:symbol/history` | 불필요 | 가격 이력 |
| GET | `/api/market/prices/:symbol/candlesticks` | 불필요 | 캔들스틱 데이터 |
| GET | `/api/market/news` | 불필요 | 뉴스 목록 |
| GET | `/api/market/indices` | 불필요 | 글로벌 시장 지수 (24개) |

### 주문 (`/api/orders`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| POST | `/api/orders` | JWT | 신규 주문 (시장가/지정가) |
| GET | `/api/orders` | JWT | 내 주문 목록 |
| GET | `/api/orders/:orderId` | JWT | 주문 상세 조회 |
| PATCH | `/api/orders/:orderId` | JWT | 주문 수정 (지정가만) |
| DELETE | `/api/orders/:orderId` | JWT | 주문 취소 |
| GET | `/api/orders/trades/history` | JWT | 체결 내역 |
| GET | `/api/orders/book/:symbol` | 불필요 | 호가창 (오더북) |

### 포트폴리오 (`/api/portfolio`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| POST | `/api/portfolio/deposit` | JWT | 입금 |
| GET | `/api/portfolio/balance` | JWT | 현금 잔고 조회 |
| GET | `/api/portfolio/holdings` | JWT | 보유 자산 조회 |
| GET | `/api/portfolio/summary` | JWT | 전체 포트폴리오 요약 |
| GET | `/api/portfolio/valuation` | JWT | 실시간 P&L 평가 |
| GET | `/api/portfolio/leaderboard` | 불필요 | 리더보드 |
| GET | `/api/portfolio/transactions` | JWT | 거래 내역 |
| GET | `/api/portfolio/watchlist` | JWT | 관심종목 목록 조회 |
| POST | `/api/portfolio/watchlist/:symbol` | JWT | 관심종목 추가 |
| DELETE | `/api/portfolio/watchlist/:symbol` | JWT | 관심종목 삭제 |

### 관리자 (`/api/admin`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/admin/users` | JWT (ADMIN) | 전체 사용자 목록 |
| GET | `/api/admin/users/:id` | JWT (ADMIN) | 사용자 상세 조회 |
| PATCH | `/api/admin/users/:id/approve` | JWT (ADMIN) | 사용자 승인 |
| PATCH | `/api/admin/users/:id/reject` | JWT (ADMIN) | 사용자 거부 |
| PATCH | `/api/admin/users/:id/role` | JWT (ADMIN) | 역할 변경 |
| PATCH | `/api/admin/users/:id/toggle-active` | JWT (ADMIN) | 활성/비활성 전환 |
| GET | `/api/admin/stats` | JWT (ADMIN) | 관리자 통계 |

### 공지사항 (`/api/announcements`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/announcements` | 불필요 | 공지사항 목록 |
| GET | `/api/announcements/:id` | 불필요 | 공지사항 상세 |
| POST | `/api/announcements` | JWT (ADMIN) | 공지사항 작성 |
| PATCH | `/api/announcements/:id` | JWT (ADMIN) | 공지사항 수정 |
| DELETE | `/api/announcements/:id` | JWT (ADMIN) | 공지사항 삭제 |
| POST | `/api/announcements/:id/like` | JWT | 좋아요 토글 |

### WebSocket 실시간 스트리밍
| 네임스페이스 | 이벤트 | 설명 |
|-------------|--------|------|
| `/prices` | `subscribe` | 가격 채널 구독 (`{ channel: "prices:BTC-USD" }`) |
| `/prices` | `unsubscribe` | 채널 구독 해제 |
| `/prices` | `price:update` | 실시간 가격 수신 (서버 → 클라이언트) |

## 서비스 포트

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Frontend | 4000 | Next.js 15 웹 UI |
| API Gateway | 3000 | 통합 진입점 (JWT 인증, 프록시, Swagger) |
| Market Data | 3001 | Yahoo Finance 시세, 캔들스틱, 뉴스 |
| Order Engine | 3002 | 주문 처리, 매칭 엔진 |
| Portfolio | 3003 | 잔고, 보유 자산, 관심종목, 정산 |
| Notification | 3004 | 알림 (스켈레톤) |
| Chat | 3005 | 채팅 (스켈레톤) |
| AI Service | 3006 | AI 분석 (스켈레톤) |
| User/Auth | 3007 | 회원가입, 로그인, JWT, 관리자 |

## 지원 자산 (20개)

### 암호화폐 (10개)
| 심볼 | 이름 |
|------|------|
| BTC-USD | Bitcoin |
| ETH-USD | Ethereum |
| SOL-USD | Solana |
| XRP-USD | Ripple |
| DOGE-USD | Dogecoin |
| ADA-USD | Cardano |
| DOT-USD | Polkadot |
| AVAX-USD | Avalanche |
| LINK-USD | Chainlink |
| MATIC-USD | Polygon |

### 주식 (10개)
| 심볼 | 이름 |
|------|------|
| AAPL | Apple |
| GOOGL | Alphabet |
| TSLA | Tesla |
| MSFT | Microsoft |
| NVDA | NVIDIA |
| AMZN | Amazon |
| META | Meta |
| NFLX | Netflix |
| AMD | AMD |
| INTC | Intel |

> 가격 데이터는 Yahoo Finance API에서 실시간으로 제공됩니다.

## 핵심 설계 패턴

- **이벤트 소싱**: Order Engine은 모든 상태 변경을 불변 이벤트로 저장
- **CQRS**: 쓰기(Event Store)와 읽기(PostgreSQL 프로젝션) 모델 분리
- **서비스별 독립 DB**: 각 마이크로서비스가 자체 데이터베이스 스키마 소유
- **API Gateway 패턴**: JWT 인증 검증, 레이트 리미팅(100req/min), 라우팅을 중앙 관리
- **Saga 패턴**: 주문 → 자금 예약 → 매칭 → 정산 흐름을 오케스트레이션
- **실시간 시세**: Yahoo Finance API 기반 실시간 가격 데이터 + 캔들스틱 생성

## 개발 단계

- [x] **Phase 0**: 기반 구축 (모노레포, Docker, 공유 패키지, 인증, Gateway, CI)
- [x] **Phase 1**: 핵심 거래 MVP (시장 데이터, 주문 엔진, 포트폴리오, Gateway 연동)
- [x] **Phase 2**: 고급 거래 + 프론트엔드 (지정가, P&L, WebSocket, Next.js 15 UI)
- [x] **Phase 2.5**: 관리자/UX (사용자 관리, 공지사항, 관심종목, 뉴스, 다국어, 반응형)
- [ ] **Phase 3**: 소셜 기능 (채팅, 알림)
- [ ] **Phase 4**: AI 통합 (매매 추천, 포트폴리오 분석)
- [ ] **Phase 5**: 프로덕션 강화 (K8s, 관측성, 부하 테스트)

## 라이센스

Private - All rights reserved.
