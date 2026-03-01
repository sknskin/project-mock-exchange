# VirtuEx - 실시간 모의 거래 플랫폼

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
| (JWT + 프록시   |
|  + WebSocket)   |
+--------+--------+
         |
    +----+-------+-------------------+-------------------+
    |            |                   |                   |
+---v-----------v-+  +---------v-------+  +--------v--------+
| User/Auth       |  | Market Data     |  | Order Engine     |
| :3007           |  | :3001           |  | :3002            |
| - 회원가입      |  | - Binance/Yahoo |  | - 이벤트 소싱    |
| - 로그인/JWT    |  | - 가격 캐시     |  | - 매칭 엔진      |
| - 관리자 기능   |  | - 캔들스틱      |  | - CQRS 읽기 모델 |
| - 공지사항/좋아요|  | - 뉴스         |  | - 고급 주문      |
| - 알림          |  +-----------------+  +---------+--------+
| - 통계          |                                |
| - 가격 알림     |                        +--------v--------+
+---------+-------+                        | Portfolio        |
          |                                | :3003            |
  +-------v-------+   +---------------+   | - 잔고 관리      |
  | Chat          |   | AI Service    |   | - 보유 자산      |
  | :3005         |   | :3006         |   | - 관심종목       |
  | - 1:1/그룹 채팅|   | - 시장 시그널  |   +-----------------+
  | - 초대/퇴장   |   | - 포트폴리오   |
  | - 읽음 확인   |   |   분석        |
  +---------------+   +---------------+
```

## 프로젝트 구조

```
virtuex/
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
│       ├── chat/                 # 1:1/그룹 채팅, 초대, 퇴장, 읽음 확인
│       └── ai-service/           # AI 시장 분석 시그널, 포트폴리오 분석
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
cd services/chat && npx prisma generate && cd ../..

# 5. 데이터베이스 마이그레이션
cd services/user-auth && npx prisma db push && cd ../..
cd services/market-data && npx prisma db push && cd ../..
cd services/order-engine && npx prisma db push && cd ../..
cd services/portfolio && npx prisma db push && cd ../..
cd services/chat && npx prisma db push && cd ../..

# 6. 전체 빌드
pnpm turbo build

# 7. 전체 서비스 실행 (백엔드 7개 + 프론트엔드)
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
| POST | `/api/orders` | JWT | 신규 주문 (시장가/지정가/STOP-LOSS/TAKE-PROFIT) |
| GET | `/api/orders` | JWT | 내 주문 목록 |
| GET | `/api/orders/:orderId` | JWT | 주문 상세 조회 |
| PATCH | `/api/orders/:orderId` | JWT | 주문 수정 (지정가만) |
| DELETE | `/api/orders/:orderId` | JWT | 주문 취소 |
| GET | `/api/orders/trades/history` | JWT | 체결 내역 |
| GET | `/api/orders/book/:symbol` | 불필요 | 호가창 (오더북) |
| POST | `/api/orders/check-triggers` | 불필요 | 조건부 주문 트리거 체크 |
| GET | `/api/orders/stats/trading` | JWT | 거래 통계 (승률, 총 수익 등) |

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

### 채팅 (`/api/chat`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/chat/rooms` | JWT | 내 채팅방 목록 |
| POST | `/api/chat/rooms` | JWT | 채팅방 생성 (DM/GROUP) |
| GET | `/api/chat/rooms/:id/messages` | JWT | 메시지 목록 (커서 페이지네이션) |
| POST | `/api/chat/rooms/:id/messages` | JWT | 메시지 전송 |
| POST | `/api/chat/rooms/:id/read` | JWT | 읽음 확인 |
| POST | `/api/chat/rooms/:id/invite` | JWT | 채팅방 초대 |
| POST | `/api/chat/rooms/:id/leave` | JWT | 채팅방 나가기 |
| POST | `/api/chat/rooms/:id/kick` | JWT (ADMIN) | 사용자 강제 퇴장 |
| GET | `/api/chat/users/search` | JWT | 사용자 검색 (초대용) |

### 알림 (`/api/notifications`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/notifications` | JWT | 알림 목록 (페이지네이션) |
| GET | `/api/notifications/unread-count` | JWT | 읽지 않은 알림 수 |
| POST | `/api/notifications/:id/read` | JWT | 알림 읽음 처리 |
| POST | `/api/notifications/read-all` | JWT | 전체 읽음 처리 |

### 가격 알림 (`/api/price-alerts`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| POST | `/api/price-alerts` | JWT | 가격 알림 생성 (최대 20개) |
| GET | `/api/price-alerts` | JWT | 내 알림 목록 |
| DELETE | `/api/price-alerts/:id` | JWT | 가격 알림 삭제 |

### 통계 (`/api/statistics`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/statistics/overview` | JWT (ADMIN) | 통계 개요 (KPI) |
| GET | `/api/statistics/registrations` | JWT (ADMIN) | 가입자 추이 |
| GET | `/api/statistics/logins` | JWT (ADMIN) | 로그인 추이 |
| GET | `/api/statistics/page-views` | JWT (ADMIN) | 페이지뷰 추이 + TOP 페이지 |
| GET | `/api/statistics/announcements` | JWT (ADMIN) | 공지사항/댓글 추이 |
| GET | `/api/statistics/users` | JWT (ADMIN) | 사용자 분포 (역할/상태) |
| GET | `/api/statistics/likes` | JWT (ADMIN) | 좋아요 통계 |
| GET | `/api/statistics/overview-trend` | JWT (ADMIN) | 전일 대비 추이 |
| GET | `/api/statistics/popular-announcements` | JWT (ADMIN) | 인기 공지 TOP 10 |
| POST | `/api/statistics/page-view` | 불필요 | 페이지 방문 기록 |

### WebSocket 실시간 스트리밍
| 네임스페이스 | 이벤트 | 설명 |
|-------------|--------|------|
| `/prices` | `subscribe` | 가격 채널 구독 (`{ channel: "prices:BTC-USD" }`) |
| `/prices` | `unsubscribe` | 채널 구독 해제 |
| `/prices` | `price:update` | 실시간 가격 수신 (서버 → 클라이언트) |
| `/chat` | `chat:join-room` | 채팅방 입장 |
| `/chat` | `chat:leave-room` | 채팅방 퇴장 |
| `/chat` | `chat:message` | 새 메시지 수신 |
| `/chat` | `chat:read` | 읽음 상태 변경 |
| `/chat` | `chat:room-created` | 채팅방 생성 알림 |
| `/chat` | `chat:invited` | 채팅방 초대 알림 |
| `/chat` | `chat:kicked` | 강제 퇴장 알림 |
| `/chat` | `chat:typing` | 타이핑 표시 |
| `/chat` | `presence:online` | 사용자 접속 알림 |
| `/chat` | `presence:offline` | 사용자 접속 해제 알림 |
| `/chat` | `presence:online-list` | 온라인 사용자 목록 |
| `/chat` | `notification:trade` | 체결 알림 |
| `/chat` | `notification:price-alert` | 가격 알림 트리거 |

### AI 분석 (`/api/ai`)
| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/ai/signals` | JWT | AI 시장 분석 시그널 (매매 추천) |
| POST | `/api/ai/portfolio-analysis` | JWT | 포트폴리오 AI 분석 (분산 점수, 리스크, 제안) |

## 서비스 포트

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Frontend | 4000 | Next.js 15 웹 UI |
| API Gateway | 3000 | 통합 진입점 (JWT 인증, 프록시, WebSocket, Swagger) |
| Market Data | 3001 | Binance/Yahoo Finance 시세, 캔들스틱, 뉴스 |
| Order Engine | 3002 | 주문 처리, 매칭 엔진 |
| Portfolio | 3003 | 잔고, 보유 자산, 관심종목, 정산 |
| Chat | 3005 | 1:1/그룹 채팅, 초대, 퇴장, 읽음 확인 |
| AI Service | 3006 | AI 시장 분석 시그널, 포트폴리오 분석 |
| User/Auth | 3007 | 회원가입, 로그인, JWT, 관리자, 공지사항, 알림, 통계, 가격 알림 |

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

> 암호화폐 시세는 Binance WebSocket에서 실시간 제공, 주식 시세는 Yahoo Finance API 기반 시뮬레이션 데이터입니다.

## 운영 스크립트

| 스크립트 | 설명 |
|---------|------|
| `scripts/start-all.sh` | 전체 서비스 일괄 실행 (Docker 인프라 + 빌드 + 8개 서비스 + 프론트엔드) |
| `scripts/rotate-logs.sh` | 로그 로테이션 (어제까지의 로그 삭제, 오늘분 보존). cron으로 매일 00:30 자동 실행 |

### 로그 로테이션 관리

```bash
# 수동 실행
bash scripts/rotate-logs.sh

# cron 비활성화 (로그 자동 정리 중지)
crontab -l | grep -v 'rotate-logs' | crontab -

# cron 재활성화
(crontab -l 2>/dev/null; echo "30 0 * * * $(pwd)/scripts/rotate-logs.sh > /dev/null 2>&1") | crontab -

# 로테이션 이력 확인
cat logs/rotate.log
```

## 핵심 설계 패턴

- **이벤트 소싱**: Order Engine은 모든 상태 변경을 불변 이벤트로 저장
- **CQRS**: 쓰기(Event Store)와 읽기(PostgreSQL 프로젝션) 모델 분리
- **서비스별 독립 DB**: 각 마이크로서비스가 자체 데이터베이스 스키마 소유
- **API Gateway 패턴**: JWT 인증 검증, 레이트 리미팅(100req/min), 라우팅을 중앙 관리
- **Saga 패턴**: 주문 → 자금 예약 → 매칭 → 정산 흐름을 오케스트레이션
- **실시간 시세**: Binance WebSocket(암호화폐) + Yahoo Finance(주식) 기반 실시간 가격 데이터
- **Redis PubSub**: 가격 데이터 실시간 브로드캐스트 + 가격 알림 모니터링
- **WebSocket 프레즌스**: Socket.IO 기반 온라인/오프라인 상태 추적
- **실시간 채팅**: Socket.IO 네임스페이스 분리 (`/prices`, `/chat`)
- **캔들스틱 집계**: 1m/5m/15m/1h/4h/1d 타임프레임 자동 생성
- **기술적 지표**: SMA, RSI, 볼린저 밴드 차트 오버레이
- **조건부 주문**: STOP-LOSS/TAKE-PROFIT 트리거 기반 자동 체결
- **AI 규칙 기반 분석**: 시장 시그널 및 포트폴리오 분석 (HHI 지수 기반 분산도)

## 개발 단계

- [x] **Phase 0**: 기반 구축 (모노레포, Docker, 공유 패키지, 인증, Gateway, CI)
- [x] **Phase 1**: 핵심 거래 MVP (시장 데이터, 주문 엔진, 포트폴리오, Gateway 연동)
- [x] **Phase 2**: 고급 거래 + 프론트엔드 (지정가, P&L, WebSocket, Next.js 15 UI)
- [x] **Phase 2.5**: 관리자/UX (사용자 관리, 공지사항, 관심종목, 뉴스, 다국어, 반응형)
- [x] **Phase 3**: 소셜 기능 + 고급 알림 + 고급 거래
  - 실시간 1:1/그룹 채팅 (Socket.IO) + 메시지 검색
  - 채팅방 생성/초대/퇴장/읽음 확인
  - 관리자 강제 퇴장(kick) 기능
  - 온라인/오프라인 상태 표시 (프레즌스)
  - 거래 체결 알림 (WebSocket + DB)
  - 가격 알림 시스템 (목표가 도달 시 자동 알림)
  - 통계 대시보드 (가입자/로그인/페이지뷰/거래/공지/좋아요 추이)
  - 우측 고정 사이드바 채팅 (토스증권 스타일)
  - 반응형 레이아웃 (모바일/태블릿 반응형, 자동 언핀)
  - 고급 주문 (STOP-LOSS, TAKE-PROFIT, 조건부 주문)
  - 차트 기술적 지표 (SMA, RSI, 볼린저 밴드)
  - Order Book 깊이 차트 시각화
  - 포트폴리오 분석 (자산배분 파이차트, P&L 분석, CSV 내보내기)
  - 리더보드 고도화 (기간/정렬 필터, 메달 뱃지, 내 순위)
  - 커뮤니티 페이지 (전략 공유, 트레이더 프로필)
  - Admin 패널 확장 (시스템 설정, 서비스 헬스, 감사 로그)
  - 접근성 개선 (포커스 트랩, ARIA, 키보드 내비게이션)
  - 마이페이지 거래 통계
- [x] **Phase 4**: AI 통합 (시장 분석 시그널, 포트폴리오 AI 분석)
- [ ] **Phase 5**: 프로덕션 강화 (K8s, 관측성, 부하 테스트)

## 라이센스

Private - All rights reserved.
