# Mock Exchange (VirtuEx) 프로젝트 기획서

## 전체 개요

Mock Exchange(VirtuEx)는 실시간 모의 주식/암호화폐 거래 플랫폼으로, 마이크로서비스 아키텍처 기반의 프로덕션급 시스템입니다. 1,000명 이상의 동시 트레이더를 지원하며, 수평 확장이 가능하고, Kubernetes 환경에 배포할 수 있도록 설계되었습니다.

---

## 주요 기능

### 거래 기능
- **실시간 시세**: 200개 이상 종목(주식, 암호화폐, ETF, 외환, 원자재)의 실시간 가격 시뮬레이션
- **주문 시스템**: 시장가/지정가 주문, 부분 체결, 주문 취소 지원
- **매칭 엔진**: Price-Time Priority 알고리즘 기반의 주문 매칭
- **포트폴리오**: 보유 자산 현황, 실현/미실현 손익(P&L) 계산, 거래 내역 조회

### 데이터 시각화
- **캔들스틱 차트**: 1분/5분/15분/1시간/1일 간격의 OHLCV 차트
- **호가창**: 실시간 매수/매도 주문 현황
- **리더보드**: 사용자 수익률 랭킹

### 사용자 경험
- **회원가입/로그인**: JWT 기반 인증 (Access Token + Refresh Token)
- **다크/라이트 테마**: 시스템 설정 연동 및 수동 전환
- **다국어 지원**: 한국어/영어 UI
- **반응형 디자인**: 모바일/태블릿/데스크톱 대응

---

## 기술 스택

### 프론트엔드
| 기술 | 용도 |
|---|---|
| **Next.js 15** | React 프레임워크 (App Router) |
| **TypeScript** | 타입 안전성 |
| **Tailwind CSS 4** | 유틸리티 기반 스타일링 |
| **Zustand** | 클라이언트 상태 관리 |
| **TanStack React Query** | 서버 상태 관리 및 캐싱 |
| **Socket.IO Client** | 실시간 WebSocket 통신 |
| **Lightweight Charts** | 캔들스틱 차트 렌더링 |

### 백엔드
| 기술 | 용도 |
|---|---|
| **NestJS** | Node.js 마이크로서비스 프레임워크 |
| **TypeScript** | 타입 안전성 |
| **Prisma** | ORM 및 데이터베이스 마이그레이션 |
| **Socket.IO** | 실시간 양방향 통신 |
| **Passport + JWT** | 인증/인가 |

### 인프라
| 기술 | 용도 |
|---|---|
| **PostgreSQL 16** | 관계형 데이터베이스 |
| **Redis 7** | 캐시, PubSub, 분산 락, 레이트 리미팅 |
| **Apache Kafka** | 서비스 간 비동기 이벤트 메시징 |
| **Docker Compose** | 로컬 개발 환경 오케스트레이션 |

### 개발 도구
| 기술 | 용도 |
|---|---|
| **Turborepo** | 모노레포 빌드 오케스트레이션 |
| **pnpm** | 패키지 매니저 (Workspace) |
| **ESLint + Prettier** | 코드 품질 및 포매팅 |
| **Swagger** | API 문서 자동 생성 |

---

## 1. 마이크로서비스 경계 정의

총 8개의 마이크로서비스로 분리하였습니다. 각 서비스는 자체 데이터베이스를 소유하는 **Database per Service** 패턴을 따릅니다.

| 서비스 | 핵심 역할 | 일관성 모델 |
|--------|----------|------------|
| **API Gateway** | 인증, 라우팅, 레이트 리미팅, WebSocket 관리 | - |
| **User/Auth Service** | 사용자 등록/로그인, JWT 발급, RBAC | CP |
| **Market Data Service** | 시뮬레이션 가격 엔진, 실시간 가격 스트리밍, 캔들스틱 | AP |
| **Order Matching Engine** | 주문 접수, 매칭 알고리즘, 이벤트 소싱 | **CP (가장 중요)** |
| **Portfolio Service** | 잔고 관리, 보유 자산, 손익 계산 | CP(쓰기) / AP(읽기) |
| **Notification Service** | 체결 알림, 가격 알림, 주문 생명주기 이벤트 | AP |
| **Chat Service** | 글로벌/자산별 채팅, 접속 상태 추적 | AP |
| **AI Service** | 매매 추천, 포트폴리오 분석, 채팅 모더레이션 | AP |

### 서비스 간 통신 방식
- **동기(Sync):** HTTP/gRPC — 요청-응답 패턴 (Gateway → 각 서비스)
- **비동기(Async):** Kafka — 이벤트 기반 통신 (서비스 → 서비스)
- **실시간:** Redis PubSub — WebSocket 팬아웃 (가격, 채팅)
- **작업 큐:** BullMQ (Redis) — AI 비동기 작업 처리

### 설계 결정 근거
- Order Engine은 자산 심볼 단위로 파티셔닝합니다. 동일 자산의 주문서(order book)는 **반드시 단일 노드**에서 처리되어야 엄격한 일관성을 보장합니다.
- Market Data Service는 리더 선출(Redis Lock)을 통해 가격 생성은 단일 인스턴스가 담당하고, 읽기/배포는 다수 인스턴스로 확장합니다.
- Chat Service는 Redis PubSub을 통해 인스턴스 간 메시지를 동기화하여 수평 확장합니다.

---

## 2. 이벤트 흐름 설계

### 핵심 거래 흐름 (주문 생명주기)

```
사용자 → API Gateway → Order Engine → Portfolio (자금 예약)
                                     → 매칭 알고리즘 실행
                                     → TradeExecuted 이벤트 발행
                                     → Portfolio (자금 정산, 보유 자산 업데이트)
                                     → Notification (체결 알림)
                                     → Market Data (최근 체결 데이터)
```

### Kafka 토픽 설계
- `market.prices.updated` — 자산 심볼로 파티셔닝, 실시간 가격
- `orders.events` — 주문 ID로 파티셔닝, 모든 주문 상태 변경 이벤트
- `trades.executed` — 체결 이벤트
- `portfolio.events` — 사용자 ID로 파티셔닝, 잔고/보유 변경
- `notifications.commands` — 알림 전송 명령
- `chat.messages` — 채팅방 ID로 파티셔닝
- `ai.jobs` / `ai.results` — AI 작업 요청/결과
- `dlq.*` — 각 토픽별 Dead Letter Queue

### 이벤트 스키마
**CloudEvents 규격**을 채택하여 서비스 간 이벤트 형식을 표준화합니다. 각 이벤트에는 `correlationId`와 `causationId`가 포함되어 분산 추적이 가능합니다.

---

## 3. CQRS 명령/조회 분리

### 핵심 원칙
- **명령(Command) 측:** 비즈니스 규칙 검증 → Event Store에 이벤트 기록 → Kafka 발행
- **조회(Query) 측:** Kafka 이벤트 소비 → PostgreSQL 읽기 모델에 프로젝션 → 클라이언트에 응답

### 엄격한 분리 규칙
- Command 핸들러는 읽기 모델을 직접 조회하지 않습니다
- Command 핸들러는 승인/ID만 반환합니다 (결과 데이터 X)
- Query 핸들러는 쓰기 모델을 수정하지 않습니다
- 읽기 모델은 최종적 일관성(Eventually Consistent)을 수용합니다

### Order Engine CQRS
**Commands:** PlaceOrder, CancelOrder, ModifyOrder, MatchOrders
**Queries:** GetOrderById, GetOrderBook, GetUserOrders, GetTradeHistory

### Portfolio Service CQRS
**Commands:** ReserveFunds, ReleaseFunds, SettleTrade, DepositFunds
**Queries:** GetBalance, GetHoldings, GetPortfolioSummary, GetPnL

---

## 4. Event Store 스키마 설계

### PostgreSQL 기반 커스텀 Event Store 선택

**EventStoreDB 대신 PostgreSQL을 선택한 이유:**
- 기존 PostgreSQL 운영 경험 활용
- 인프라 단순화 (별도 DB 시스템 추가 불필요)
- 모의 거래 규모에서 충분한 성능
- Outbox 패턴으로 Kafka 발행과 이벤트 저장의 원자성 보장 가능

### 핵심 테이블
1. **`event_store`** — 핵심 이벤트 저장소 (append-only)
   - `global_position` (전역 순서), `stream_id` (집계체 식별), `stream_position` (스트림 내 버전)
   - 낙관적 동시성 제어: `(stream_id, stream_position)` 유니크 제약

2. **`event_snapshots`** — 집계체 상태 스냅샷 (성능 최적화)
   - 이벤트가 많이 쌓인 집계체의 재구성 속도 향상

3. **`event_subscriptions`** — 프로젝터/컨슈머 체크포인트
   - 각 프로젝터가 마지막으로 처리한 `global_position` 기록

4. **`event_outbox`** — Outbox 패턴 테이블
   - 이벤트 저장과 동일 트랜잭션에서 Outbox에 기록
   - 백그라운드 폴러가 미발행 항목을 Kafka로 발행
   - **at-least-once 전달 보장** → 컨슈머는 멱등성 필수

---

## 5. PostgreSQL 읽기 모델 설계

각 서비스별로 조회 패턴에 최적화된 읽기 모델을 설계했습니다.

### Order Service 읽기 모델
- `orders_read` — 주문 상태 조회 (사용자별, 심볼별 인덱스)
- `trades_read` — 체결 내역 (구매자/판매자별 인덱스)

### Portfolio Service 읽기 모델
- `balances_read` — 사용자 잔고 (가용/예약/총액)
- `holdings_read` — 보유 자산 (심볼별 수량, 평균 매입가)
- `transactions_read` — 거래 원장 (입출금, 매수/매도)
- `pnl_summary` — 손익 요약 (Materialized View, 주기적 갱신)

### Market Data 읽기 모델
- `assets` — 자산 메타데이터
- `price_history` — 가격 이력 (시계열 최적화 인덱스)
- `candlesticks` — OHLCV 캔들스틱 (구간별 유니크 제약)

### 기타 읽기 모델
- `notifications` / `price_alerts` — 알림 및 가격 알림 설정
- `chat_rooms` / `chat_messages` — 채팅방 및 메시지
- `users` / `refresh_tokens` — 사용자 인증

---

## 6. Redis 사용 전략

Redis를 **5가지 용도**로 활용합니다:

### 6.1 캐시 레이어
- 최신 가격, 주문서, 포트폴리오 잔고, 세션 캐시
- TTL 기반 만료 + 이벤트 기반 무효화 결합

### 6.2 실시간 PubSub
- 가격 스트리밍, 채팅 메시지 팬아웃, 알림 푸시, 접속 상태
- WebSocket 인스턴스 간 메시지 동기화

### 6.3 분산 락 (Redlock)
- 주문서 세그먼트 락, 사용자별 잔고 연산 락
- Market Data 리더 선출, 멱등성 키 락

### 6.4 레이트 리미팅
- 슬라이딩 윈도우 방식 (ZADD + ZRANGEBYSCORE)
- API, 채팅, 주문별 제한

### 6.5 작업 큐 (BullMQ)
- AI 처리, 알림 전송, Outbox 릴레이, 캔들스틱 집계

### 키 네이밍 규칙
`{service}:{entity}:{identifier}:{field}` 형식으로 통일

### 캐시 무효화 전략
| 항목 | TTL | 무효화 방식 |
|------|-----|------------|
| 최신 가격 | 5초 | Write-through |
| 주문서 | 1초 | Write-through |
| 잔고 | 30초 | Write-behind |
| 세션 | 15분 | TTL + 명시적 |

---

## 7. Saga 패턴 결정

### 오케스트레이션 vs 코레오그래피

**오케스트레이션 (핵심 거래 흐름)**을 선택한 이유:
- 주문 → 자금 예약 → 매칭 → 정산 흐름은 **엄격한 순서와 롤백**이 필요
- 중앙 집중식 로직으로 보상 트랜잭션 추적이 용이
- 디버깅과 테스트가 상대적으로 쉬움

**코레오그래피 (알림, 채팅 모더레이션)**를 선택한 이유:
- 단순한 이벤트 반응형 흐름
- 롤백이 필요 없는 fire-and-forget 패턴
- 서비스 자율성 극대화

### 주문 배치 Saga 흐름
1. 주문 검증 → 2. 자금 예약 (Portfolio) → 3. 주문서 등록 + 매칭 → 4. 체결 정산 (Portfolio) → 5. 이벤트 발행

### 보상 로직
- 각 단계 실패 시 역순으로 보상 트랜잭션 실행
- 보상은 멱등성 보장 (같은 멱등성 키에 "comp-" 접두사)
- 최대 3회 재시도 후 Dead Letter Queue로 이동

### Saga 상태 관리
- `saga_instances` 테이블로 현재 상태 추적
- `saga_step_log` 테이블로 각 단계 실행/보상 이력 기록

---

## 8. WebSocket 게이트웨이 아키텍처

### 설계 핵심
- **Socket.IO + Redis Adapter** 사용하여 다수의 Gateway 인스턴스 간 메시지 동기화
- Sticky Session (userId 기반)으로 로드밸런서 구성
- 각 Pod당 ~5,000 WebSocket 연결 목표

### 채널 구조
- `prices:{symbol}` — 실시간 가격 (공개)
- `orderbook:{symbol}` — 주문서 깊이 (공개)
- `user:{userId}:orders` — 주문 업데이트 (비공개)
- `user:{userId}:portfolio` — 포트폴리오 업데이트 (비공개)
- `user:{userId}:notifications` — 알림 (비공개)
- `chat:{roomId}` — 채팅 메시지
- `trades:{symbol}` — 최근 체결 피드

### 연결 생명주기
1. WebSocket 연결 → JWT 검증
2. Redis에 연결 정보 등록
3. 채널 구독 (SUBSCRIBE)
4. 하트비트 (30초 간격, 10초 타임아웃)
5. 연결 해제 시 Redis 정리 + 구독 해제

---

## 9. Kubernetes 배포 전략

### 클러스터 구조
- **3개 네임스페이스:** prod, staging, monitoring
- 모든 서비스: **Deployment + HPA** (수평 자동 확장)
- 인프라: **StatefulSet** (PostgreSQL, Redis Cluster, Kafka)
- 모니터링: Prometheus + Grafana + Loki + Tempo

### 배포 방식
- **Rolling Update (기본):** 무중단 배포, maxSurge=1, maxUnavailable=0
- **Blue-Green (Order Engine):** 매칭 엔진의 완전한 무중단 전환
- **Canary (API Gateway, 선택):** 10% 트래픽으로 카나리 테스트

### 리소스 할당
Order Engine이 가장 높은 CPU/메모리 할당 (500m~1000m CPU, 512Mi~1Gi Memory)
PostgreSQL Primary가 가장 높은 인프라 리소스 (500m~2000m CPU, 1~4Gi Memory)

### 헬스 체크
- **Liveness Probe:** /health/live — 프로세스 살아있는지 확인
- **Readiness Probe:** /health/ready — 트래픽 받을 준비 됐는지 확인
- **Startup Probe:** /health/startup — 초기 시작 완료 확인 (최대 2.5분)

### Helm 차트
서비스별 템플릿 (deployment, service, hpa) + 인프라 + 모니터링 구성

---

## 10. CI/CD 파이프라인 전략

### PR 파이프라인 (Pull Request 시)
Lint → Type Check → Unit Test → Integration Test → Security Scan → Build Check

### Main 파이프라인 (머지 시)
전체 검증 → Docker 이미지 빌드 → Container Registry Push → Staging 배포 → E2E 테스트 → 수동 승인 → Production 배포

### 모노레포 빌드 최적화
- **Turborepo**로 영향받은 서비스만 빌드/테스트
- Docker 레이어 캐싱으로 빌드 시간 단축
- Multi-stage Dockerfile로 프로덕션 이미지 최소화

### 데이터베이스 마이그레이션
- K8s Job으로 배포 전 실행
- **Forward-compatible only:** 이전 버전을 절대 깨뜨리지 않는 마이그레이션
- Prisma Migrate 사용

---

## 11. 확장성 병목점 분석

| 병목점 | 영향 | 대응 전략 |
|--------|------|----------|
| 단일 자산 주문서 단일 스레드 처리 | 동일 자산 내 병렬화 불가 | 자산별 파티셔닝. 고거래량 자산은 전용 노드 |
| Event Store 쓰기 처리량 | DB I/O 한계 | 스트림 프리픽스별 파티셔닝, PgBouncer |
| Kafka 컨슈머 랙 | 읽기 모델 지연 | 파티션 수 증가, 배치 처리, 컨슈머 인스턴스 확장 |
| Redis PubSub 팬아웃 | 고빈도 가격 업데이트 부하 | 가격 업데이트 스로틀링 (10/초/심볼), 배치 전송 |
| WebSocket 연결 수 제한 | OS 소켓 한계 | ulimit 튜닝, Pod당 5K 연결, 수평 확장 |
| 잔고 예약 경쟁 조건 | 동시 주문 시 데이터 불일치 | 사용자별 Redis Lock (Redlock, 5초 TTL) |

### 확장 단계 (Tier)
- Tier 1 (100명): 단일 인스턴스, ~$50/월
- **Tier 2 (1,000명, 목표):** 서비스당 2-3 인스턴스, ~$300/월
- Tier 3 (10,000명): 서비스당 5-10 인스턴스, 서비스별 DB 분리, ~$1,500/월
- Tier 4 (100,000+명): 샤딩, 리전 배포, ~$10,000+/월

---

## 12. 트레이드오프 상세 분석

### CAP 정리 적용

| 서비스 | 선택 | 근거 |
|--------|------|------|
| Order Engine | **CP** | 두 주문이 같은 유동성을 매칭하면 안 됨. 네트워크 분할 시 주문 거부 |
| Portfolio (쓰기) | **CP** | 잔고가 음수가 되면 안 됨 |
| Portfolio (읽기) | **AP** | 약간 지연된 잔고 표시는 허용 가능 |
| Market Data | **AP** | 약간 지연된 가격이 가격 없음보다 나음 |
| Chat | **AP** | 메시지 약간의 지연/순서 변경 허용 |
| Notification | **AP** | 중복 알림이 누락 알림보다 나음 (at-least-once) |

### 이벤트 소싱 트레이드오프
**장점:** 완전한 감사 추적, 상태 재구성 가능, 시간 여행 디버깅, 새 프로젝션 소급 추가
**단점:** 저장 공간 증가, 이벤트 버전 관리 복잡성, 최종적 일관성 읽기 모델, 스냅샷 관리 필요

### CQRS 트레이드오프
**장점:** 읽기/쓰기 독립 확장, 조회 패턴별 최적화된 읽기 모델
**단점:** 최종적 일관성, 프로젝션 인프라 추가, 동기화 실패 처리 복잡성

### 커스텀 Event Store vs EventStoreDB
PostgreSQL 기반을 선택한 이유: 기존 인프라 활용, 운영 단순화, Outbox 패턴 구현 용이, 모의 거래 규모에서 충분한 성능.

---

## 13. 단계별 로드맵

| 단계 | 기간 | 목표 | 주요 산출물 |
|------|------|------|------------|
| Phase 0 | 1-2주 | 기반 구축 | 모노레포, Docker Compose, CI, 인증 |
| Phase 1 | 3-6주 | 핵심 거래 MVP | 가격 엔진, 시장가 주문, 포트폴리오, 기본 프론트엔드 |
| Phase 2 | 7-10주 | 고급 거래 | 지정가 주문, 부분 체결, 캔들스틱, 차트, P&L |
| Phase 3 | 11-13주 | 소셜/알림 | 채팅, 가격 알림, 알림 센터 |
| Phase 4 | 14-16주 | AI 기능 | 매매 추천, 포트폴리오 분석, 모더레이션 |
| Phase 5 | 17-20주 | 프로덕션 강화 | 관측성, 보안, 부하 테스트, Helm 차트 |
| Phase 6 | 지속 | 엔터프라이즈 | 다중 리전, 고급 주문, 카피 트레이딩 |

---

## 14. 부하 테스트 전략

### 도구: Grafana k6
- JavaScript 테스트 스크립트, WebSocket 네이티브 지원
- Kubernetes 통합, Grafana 대시보드 연동

### 테스트 시나리오 (6가지)
1. **가격 스트리밍:** 1,000 WS 연결, 3-5 심볼 구독, p99 < 100ms
2. **주문 처리량:** 500 주문/초, p99 접수 < 200ms, 매칭 < 500ms
3. **포트폴리오 조회:** 1,000 동시 조회 + 200 주문/초, p99 < 300ms
4. **채팅 부하:** 100 메시지/초, 1,000명 글로벌 채팅방, p99 < 500ms
5. **스파이크:** 100→2,000명 1분 내 급증, 에러율 < 1%, HPA 60초 내 응답
6. **내구성(Soak):** 500명 4시간 지속, 메모리 증가 < 20%

---

## 15. 장애 시뮬레이션 전략

### 도구: Chaos Mesh (Kubernetes-native)

### 장애 카테고리 (4가지)

**네트워크 장애:** Kafka 브로커 파티션, Redis 노드 장애, 서비스 간 레이턴시 주입 (500ms)
**서비스 장애:** Order Engine Saga 중간 크래시, Portfolio 60초 불가, Market Data 크래시
**데이터스토어 장애:** PostgreSQL 페일오버, Redis 메모리 압박, Kafka 브로커 1대 장애
**리소스 고갈:** CPU 스로틀링, 메모리 압박, DB 커넥션 풀 고갈

### Game Day 프로토콜
- 월 1회 실시, 카테고리별 세션, 런북 문서화, 킬 스위치 준비, 사후 분석

---

## 16. 로컬 개발 Docker Compose

### 구성
- **인프라:** PostgreSQL 16, Redis 7, Kafka (KRaft 모드, Zookeeper 없음)
- **앱 서비스:** 8개 NestJS 서비스 (포트 3000-3007)
- **프론트엔드:** Next.js (포트 4000)
- **모니터링 (선택):** Prometheus, Grafana, Jaeger
- **개발 도구:** PgAdmin, Redis Commander, Kafka UI, MailHog

### 개발 워크플로우
인프라만 Docker로 실행하고 서비스는 로컬에서 핫 리로드로 개발 가능. 또는 전체 Docker 실행도 지원.

---

## 17. 폴더 구조

### 모노레포 구성 (Turborepo + pnpm)

```
/Users/dohee/Documents/workspace/mock-exchange/
├── packages/          # 공유 라이브러리
│   ├── common/        # 이벤트, DTO, 유틸리티
│   ├── event-store/   # Event Store 라이브러리
│   ├── saga/          # Saga 프레임워크
│   └── observability/ # OpenTelemetry 설정
├── services/          # 마이크로서비스 (각각 Clean Architecture)
│   ├── api-gateway/
│   ├── user-auth/
│   ├── market-data/
│   ├── order-engine/
│   ├── portfolio/
│   ├── notification/
│   ├── chat/
│   └── ai-service/
├── apps/              # 프론트엔드
│   └── web/           # Next.js (App Router)
├── infrastructure/    # 인프라 설정
│   ├── docker/
│   ├── k8s/
│   └── helm/
├── scripts/           # 개발/운영 스크립트
├── tests/             # 통합/부하/카오스 테스트
│   ├── e2e/
│   ├── load/
│   └── chaos/
├── docs/              # 문서 (ADR, API, 런북, 다이어그램)
└── .github/workflows/ # CI/CD 파이프라인
```

### 각 서비스 내부 구조 (Clean Architecture)
```
service/src/
├── domain/            # 도메인 계층 (순수 비즈니스 로직)
│   ├── aggregates/    # 집계체 (이벤트 소싱 대상)
│   ├── entities/      # 엔티티
│   ├── value-objects/ # 값 객체
│   ├── events/        # 도메인 이벤트
│   ├── services/      # 도메인 서비스
│   └── repositories/  # 리포지토리 인터페이스
├── application/       # 애플리케이션 계층 (유스케이스)
│   ├── commands/      # 명령 핸들러
│   ├── queries/       # 조회 핸들러
│   ├── sagas/         # Saga 오케스트레이터
│   └── projectors/    # 읽기 모델 프로젝터
├── infrastructure/    # 인프라 계층 (외부 의존성)
│   ├── persistence/   # 리포지토리 구현체 (Prisma)
│   ├── kafka/         # 이벤트 발행/소비
│   └── redis/         # 캐시, 락
└── presentation/      # 프레젠테이션 계층 (컨트롤러)
    ├── controllers/
    └── dto/
```

---

## 비기능 요구사항 구현

### 멱등성 (Idempotency)
- 클라이언트 생성 UUID 멱등성 키
- Redis NX로 중복 요청 감지 (24시간 TTL)
- Event Store의 event_id 유니크 제약
- Kafka 프로듀서 멱등성 활성화

### Dead Letter Queue 전략
- 3회 재시도 (지수 백오프: 1초 → 5초 → 25초)
- 실패 시 `dlq.{토픽}` 으로 이동
- PostgreSQL에 실패 메시지 기록
- 운영팀 알림 발송
- 관리자 API로 수동 재시도 가능
- 30일 보관

### 레이트 리미팅
- Redis 슬라이딩 윈도우 방식
- API: 100/분, 주문: 30/분, 채팅: 60/분
- 로그인: 5/분/IP (브루트포스 방지)
- 전체: 1000/분/IP

### 보안
- JWT RS256 (15분), Refresh Token httpOnly Cookie (7일)
- RBAC (TRADER, MODERATOR, ADMIN)
- Prisma 파라미터화 쿼리 (SQL Injection 방지)
- Decimal.js (부동소수점 오류 방지)
- K8s Network Policy, Sealed Secrets, 컨테이너 이미지 스캔

### 관측성 (Observability)
- **메트릭:** Prometheus + Grafana (RED 메트릭 + 비즈니스 메트릭)
- **로깅:** Loki + Pino (구조화 JSON, Correlation ID 전파)
- **추적:** Tempo + OpenTelemetry (서비스 간 분산 추적)
- **알림:** AlertManager (레이턴시, 에러율, 컨슈머 랙, Pod 재시작)

---

## 적용된 설계 패턴 및 개념 총정리

| 카테고리 | 패턴/개념 |
|----------|----------|
| 아키텍처 | Microservices, Clean Architecture, Hexagonal Architecture |
| 데이터 | CQRS, Event Sourcing, Outbox Pattern, Database per Service |
| 분산 트랜잭션 | Saga (Orchestration + Choreography), Compensating Transactions |
| 메시징 | Event-Driven Architecture, Pub/Sub, Message Queue, CloudEvents |
| 동시성 | Optimistic Concurrency Control, Distributed Locking (Redlock) |
| 캐싱 | Write-Through, Write-Behind, Cache-Aside, TTL-based Eviction |
| 복원력 | Circuit Breaker, Retry with Backoff, Dead Letter Queue, Bulkhead |
| 확장성 | Horizontal Scaling, Partitioning, Leader Election |
| 관측성 | RED Metrics, Distributed Tracing, Structured Logging, Correlation ID |
| 배포 | Rolling Update, Blue-Green, Canary, GitOps, Helm |
| 테스트 | Chaos Engineering, Load Testing, Game Day |
| 보안 | JWT + Refresh Token, RBAC, Rate Limiting, Input Validation |
| 개발 | Monorepo (Turborepo), Docker Compose, Affected-based CI |

---

> 이 문서는 Mock Exchange 프로젝트의 전체 아키텍처 설계를 정리한 것입니다.
> 다음 단계는 Phase 0부터 실제 코드 구현을 시작하는 것입니다.
