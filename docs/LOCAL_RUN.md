# VirtuEx 로컬 실행 가이드

## 프로젝트 소개

VirtuEx는 실시간 모의 주식/암호화폐 거래 플랫폼입니다. NestJS 기반 마이크로서비스 백엔드와 Next.js 15 프론트엔드로 구성되어 있으며, PostgreSQL, Redis, Kafka를 인프라로 사용합니다.

---

## 사전 요구사항

- **Docker Desktop** (실행 중이어야 함)
- **Node.js** 20+ (`node -v`로 확인)
- **pnpm** (`npm install -g pnpm`)

> **주의**: 로컬에 PostgreSQL이 5432 포트로 실행 중이면 Docker 컨테이너와 포트 충돌이 발생합니다.
> `brew services stop postgresql@16` 으로 중지하거나 docker-compose.yml에서 포트를 변경하세요.

---

## 한 줄로 전체 실행 (권장)

아래의 수동 실행 단계(1~7)를 **스크립트 하나로 자동 실행**할 수 있습니다.

```bash
bash scripts/start-all.sh
```

이 스크립트는 다음을 순서대로 자동 처리합니다:

0. **기존 서비스 자동 종료** (포트 3000~3003, 3005~3007, 4000에 실행 중인 프로세스 감지 시 자동 kill)
1. 사전 체크 (Node.js, pnpm, Docker 설치 확인)
2. 로컬 PostgreSQL 충돌 감지 시 자동 중지
3. `.env` 로드 (없으면 `.env.example`에서 자동 복사)
4. Docker 인프라 시작 (PostgreSQL, Redis, Kafka) + healthy 대기
5. Kafka 토픽 자동 생성
6. 빌드 (`pnpm install` + `turbo build`, 이미 빌드된 경우 스킵)
7. DB 마이그레이션 (Prisma db push)
8. 백엔드 7개 서비스 + 프론트엔드 동시 실행

> 이미 서비스가 실행 중이더라도 스크립트가 자동으로 종료 후 재시작하므로 별도 정리 없이 바로 실행 가능합니다.

> **종료**: `Ctrl+C`를 누르면 모든 서비스가 자동으로 정리됩니다.
> 로그 확인: `tail -f logs/{서비스명}.log`

---

## 수동 실행 가이드

위의 `start-all.sh` 스크립트를 사용하지 않고 직접 실행하려면 아래 단계를 따르세요.

---

### 1. 환경변수 설정

```bash
cd /Users/dohee/Documents/workspace/project/virtuex

# .env 파일이 없으면 예제에서 복사
cp .env.example .env
```

#### 주요 환경변수 설명

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/mockexchange` | PostgreSQL 연결 문자열 |
| `REDIS_URL` | `redis://localhost:6379` | Redis 연결 문자열 |
| `REDIS_PASSWORD` | `redis` | Redis 비밀번호 |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka 브로커 주소 |
| `JWT_SECRET` | `dev-jwt-secret-...` | JWT 서명 비밀키 (프로덕션에서는 반드시 변경) |
| `JWT_ACCESS_EXPIRY` | `15m` | Access Token 만료 시간 |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh Token 만료 시간 |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | 프론트엔드에서 사용하는 API 주소 |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3000` | 프론트엔드 WebSocket 주소 |

> `.env.example`의 기본값은 로컬 개발 환경에 맞추어져 있으므로 별도 수정 없이 사용 가능합니다.

---

### 2. 인프라 실행 (Docker)

```bash
# PostgreSQL, Redis, Kafka 컨테이너 시작
docker compose up -d postgres redis kafka

# 상태 확인 (모두 healthy 상태가 될 때까지 대기)
docker ps
```

각 컨테이너의 역할:

| 컨테이너 | 용도 | 포트 |
|---|---|---|
| `mex-postgres` | 데이터 영속화 (사용자, 주문, 포트폴리오 등) | 5432 |
| `mex-redis` | 캐시, 실시간 PubSub, SMS 인증코드 저장, 세션 관리, 레이트 리미팅 | 6379 |
| `mex-kafka` | 서비스 간 비동기 이벤트 메시징 | 9092 |

> 모든 컨테이너가 `healthy` 상태가 될 때까지 약 15~30초 소요됩니다.

---

### 3. 의존성 설치 + 빌드

```bash
pnpm install
npx turbo build
```

- `pnpm install`: 모노레포 전체 의존성 설치 (공유 패키지 포함)
- `npx turbo build`: Turborepo를 통해 모든 서비스와 프론트엔드를 병렬 빌드

> 최초 빌드는 2~3분 소요될 수 있습니다. 이후에는 캐시로 빠르게 완료됩니다.

> **참고**: 빌드 후 `dist/` 디렉토리가 비어있는 경우 `tsconfig.tsbuildinfo` 캐시가 원인일 수 있습니다.
> `rm -f backend/services/*/tsconfig.tsbuildinfo && npx turbo build --force`로 해결하세요.

---

### 4. DB 마이그레이션 (최초 1회)

```bash
# 환경변수 로드
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# 각 서비스 Prisma DB push
cd backend/services/user-auth && npx prisma db push && cd ../../..
cd backend/services/market-data && npx prisma db push && cd ../../..
cd backend/services/order-engine && npx prisma db push && cd ../../..
cd backend/services/portfolio && npx prisma db push && cd ../../..
cd backend/services/chat && npx prisma db push && cd ../../..
```

> `prisma db push`는 Prisma 스키마를 기반으로 데이터베이스 테이블을 생성/동기화합니다.
> 스키마가 변경되지 않은 경우 다시 실행해도 안전합니다.

각 서비스별 데이터베이스:

| 서비스 | 데이터베이스 |
|---|---|
| User/Auth | `mex_auth` |
| Market Data | `mex_market` |
| Order Engine | `mex_orders` |
| Portfolio | `mex_portfolio` |
| Chat | `mex_chat` |

---

### 5. Kafka 토픽 생성 (최초 1회)

```bash
docker exec mex-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create --if-not-exists \
  --topic price.updated --partitions 3

docker exec mex-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create --if-not-exists \
  --topic order.events --partitions 3

docker exec mex-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create --if-not-exists \
  --topic trade.events --partitions 3

docker exec mex-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create --if-not-exists \
  --topic portfolio.events --partitions 3
```

각 토픽의 역할:

| 토픽 | 설명 |
|---|---|
| `price.updated` | 실시간 가격 변동 이벤트 (Market Data → 전체 서비스) |
| `order.events` | 주문 생성/취소/체결 등 상태 변경 이벤트 |
| `trade.events` | 체결 완료 이벤트 (매칭 엔진 → Portfolio, Notification) |
| `portfolio.events` | 잔고/보유자산 변경 이벤트 |

---

### 6. 백엔드 서비스 실행

**각각 별도 터미널**에서 실행합니다. 모든 터미널에서 먼저 환경변수를 로드합니다:

```bash
cd /Users/dohee/Documents/workspace/project/virtuex
export $(grep -v '^#' .env | grep -v '^$' | xargs)
```

#### 터미널 1 - User Auth (3007)
```bash
node backend/services/user-auth/dist/main.js
```
사용자 등록, SMS 인증, 로그인(2FA), JWT 발급, 비밀번호 재설정, 관리자 기능, 공지사항, 커뮤니티 게시판을 처리합니다.

#### 터미널 2 - Market Data (3001)
```bash
node backend/services/market-data/dist/main.js
```
200개 이상의 종목 가격을 실시간 시뮬레이션하고, 캔들스틱 데이터를 생성합니다.

#### 터미널 3 - Order Engine (3002)
```bash
node backend/services/order-engine/dist/main.js
```
시장가/지정가 주문을 접수하고, 매칭 알고리즘으로 체결을 처리합니다.

#### 터미널 4 - Portfolio (3003)
```bash
node backend/services/portfolio/dist/main.js
```
사용자 잔고 관리, 보유 자산 추적, 손익(P&L) 계산을 담당합니다.

#### 터미널 5 - Notification (3004)
```bash
node backend/services/notification/dist/main.js
```
이메일 알림, 인앱 알림, 가격 알림을 처리합니다.

#### 터미널 6 - Chat (3005)
```bash
node backend/services/chat/dist/main.js
```
실시간 1:1/그룹 채팅, 초대, 퇴장, 읽음 확인을 처리합니다.

#### 터미널 7 - AI Service (3006)
```bash
node backend/services/ai-service/dist/main.js
```
AI 시장 분석 시그널, 포트폴리오 분석을 제공합니다.

#### 터미널 8 - API Gateway (3000)
```bash
node backend/services/api-gateway/dist/main.js
```
프론트엔드의 모든 요청을 받아 각 서비스로 라우팅하고, WebSocket 연결을 관리합니다.

> **확인**: `curl http://localhost:3000/api/health/live` → `{"status":"ok"}`

---

### 7. 프론트엔드 실행

#### 터미널 9
```bash
cd frontend
pnpm dev
```

Next.js 15 App Router 기반의 프론트엔드가 포트 4000에서 시작됩니다.

---

## 브라우저 접속

| URL | 설명 |
|---|---|
| http://localhost:4000 | 랜딩 페이지 (프로젝트 소개) |
| http://localhost:4000/login | 로그인 (SMS 2FA 인증) |
| http://localhost:4000/register | 회원가입 (SMS 인증, 다음 우편번호 주소검색) |
| http://localhost:4000/forgot-password | 비밀번호 재설정 (SMS 인증) |
| http://localhost:4000/dashboard | 마켓 대시보드 (실시간 가격, 관심종목 탭) |
| http://localhost:4000/asset/BTC-USD | 종목 상세 (차트, 주문, 호가, 깊이 차트) |
| http://localhost:4000/portfolio | 포트폴리오 (보유자산/잔고/분석) |
| http://localhost:4000/orders | 주문 내역 (분석/CSV 내보내기) |
| http://localhost:4000/leaderboard | 리더보드 (기간/정렬 필터, 메달 뱃지) |
| http://localhost:4000/news | 뉴스 목록 |
| http://localhost:4000/announcements | 공지사항 목록 |
| http://localhost:4000/announcements/:id | 공지사항 상세 (조회수, 좋아요, 댓글) |
| http://localhost:4000/announcements/new | 공지사항 작성 (ADMIN) |
| http://localhost:4000/announcements/:id/edit | 공지사항 수정 (ADMIN) |
| http://localhost:4000/community | 커뮤니티 자유게시판 (TipTap 에디터) |
| http://localhost:4000/community/new | 게시글 작성 |
| http://localhost:4000/community/:id | 게시글 상세 (좋아요, 댓글) |
| http://localhost:4000/mypage | 마이페이지 (프로필, 거래 통계, 설정) |
| http://localhost:4000/mypage/edit | 프로필 수정 (주소, 비밀번호 변경) |
| http://localhost:4000/help | 도움말 |
| http://localhost:4000/admin/users | 관리자 - 사용자 관리 (ADMIN 전용) |
| http://localhost:4000/admin/users/:id | 관리자 - 사용자 상세 (ADMIN 전용) |
| http://localhost:4000/admin/stats | 관리자 - 통계 대시보드 (ADMIN 전용) |
| http://localhost:4000/admin/settings | 관리자 - 시스템 설정 (ADMIN 전용) |
| http://localhost:4000/admin/health | 관리자 - 서비스 상태 (ADMIN 전용) |
| http://localhost:4000/admin/audit | 관리자 - 감사 보고서 (ADMIN 전용) |
| http://localhost:3000/api-docs | Swagger API 문서 |

---

## 종료

```bash
# 각 터미널에서 Ctrl+C로 서비스 종료

# Docker 인프라 종료
docker compose down

# 로컬 PostgreSQL 다시 시작 (필요 시)
brew services start postgresql@16
```

> `start-all.sh`로 실행한 경우 `Ctrl+C` 한 번으로 모든 서비스가 자동 종료됩니다.

---

## 로그 관리

### 로그 파일 위치

모든 서비스 로그는 `logs/` 디렉토리에 저장됩니다.

```bash
tail -f logs/api-gateway.log   # API Gateway
tail -f logs/user-auth.log     # User Auth
tail -f logs/market-data.log   # Market Data
tail -f logs/order-engine.log  # Order Engine
tail -f logs/portfolio.log     # Portfolio
tail -f logs/notification.log  # Notification
tail -f logs/chat.log          # Chat
tail -f logs/ai-service.log    # AI Service
tail -f logs/frontend.log      # Frontend
```

### 로그 로테이션 (자동 정리)

`scripts/rotate-logs.sh` 배치가 **매일 자정 00:30**에 cron으로 실행되어 어제까지의 로그를 자동 삭제합니다.

**동작 방식:**
1. 모든 로그 파일(백엔드 + 프론트엔드)에서 오늘 날짜의 로그만 추출
2. 서비스 잠시 중지 (~2초)
3. 로그 파일을 오늘분으로 교체
4. 서비스 자동 재시작 + 헬스 체크
5. 로테이션 이력은 `logs/rotate.log`에 기록

> 프론트엔드 로그에도 `[YYYY. MM. DD. HH:MM:SS]` 형식의 타임스탬프가 자동 부여되므로
> 백엔드와 동일하게 날짜별 필터링이 적용됩니다.

**수동 실행:**

```bash
bash scripts/rotate-logs.sh
```

**cron 비활성화 (로그 로테이션 중지):**

```bash
crontab -l | grep -v 'rotate-logs' | crontab -
```

**cron 재활성화:**

```bash
(crontab -l 2>/dev/null; echo "30 0 * * * $(pwd)/scripts/rotate-logs.sh > /dev/null 2>&1") | crontab -
```

**cron 등록 확인:**

```bash
crontab -l
```

---

## 서비스 아키텍처

```
┌─────────────┐     ┌──────────────┐
│  Frontend   │────▶│  API Gateway │
│ (Next.js)   │◀────│   (3000)     │
│   :4000     │ WS  └──────┬───────┘
└─────────────┘            │ HTTP Proxy
                    ┌──────┼──────────────┬──────────────┐
                    │      │              │              │
              ┌─────▼──┐ ┌─▼────────┐ ┌──▼─────────┐ ┌─▼──────────┐
              │User Auth│ │Market    │ │Order       │ │Notification │
              │ (3007)  │ │Data(3001)│ │Engine(3002)│ │  (3004)     │
              └─────────┘ └──────────┘ └──────┬─────┘ └────────────┘
                                              │ Kafka
                                        ┌─────▼──────┐
                                        │ Portfolio   │
                                        │   (3003)    │
                                        └─────────────┘
```

---

## 서비스 포트 정리

| 서비스 | 포트 | 설명 |
|---|---|---|
| Frontend (Next.js) | 4000 | 웹 UI |
| API Gateway | 3000 | 프록시 + WebSocket + Swagger |
| Market Data | 3001 | 시세/차트 데이터 |
| Order Engine | 3002 | 주문 매칭 |
| Portfolio | 3003 | 잔고/보유자산 |
| Notification | 3004 | 알림 |
| Chat | 3005 | 채팅 |
| AI Service | 3006 | AI |
| User Auth | 3007 | 인증/관리자/커뮤니티 |
| PostgreSQL | 5432 | DB (Docker) |
| Redis | 6379 | 캐시 (Docker) |
| Kafka | 9092 | 메시지 브로커 (Docker) |

---

## 트러블슈팅

### 포트 충돌

```bash
# 특정 포트를 사용 중인 프로세스 확인
lsof -i :5432
lsof -i :3000

# 로컬 PostgreSQL 중지
brew services stop postgresql@16
```

### Docker 컨테이너 재시작

```bash
# 모든 컨테이너 중지 후 재시작
docker compose down
docker compose up -d postgres redis kafka
```

### 빌드 오류 시

```bash
# node_modules 초기화 후 재설치
rm -rf node_modules
pnpm install
npx turbo build --force
```

### 빌드 후 dist/ 디렉토리가 비어있는 경우

```bash
# tsconfig.tsbuildinfo 캐시가 원인일 수 있음
rm -f backend/services/*/tsconfig.tsbuildinfo
npx turbo build --force
```

### DB 초기화 (데이터 완전 삭제)

```bash
# Docker 볼륨까지 삭제하여 DB 초기화
docker compose down -v
docker compose up -d postgres redis kafka
# 이후 Prisma db push 다시 실행
```

### Kafka 토픽 확인

```bash
# 생성된 토픽 목록 확인
docker exec mex-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list
```

### Redis 접속 (SMS 인증코드 확인 등)

```bash
# Redis CLI 접속
docker exec -it mex-redis redis-cli -a redis

# SMS 인증코드 확인
KEYS sms:*
GET sms:verify:01012345678
```
