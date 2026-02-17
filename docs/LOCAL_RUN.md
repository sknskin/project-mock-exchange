# Mock Exchange 로컬 실행 가이드

## 사전 요구사항

- **Docker Desktop** (실행 중이어야 함)
- **Node.js** 18+
- **pnpm** (`npm install -g pnpm`)

> **주의**: 로컬에 PostgreSQL이 5432 포트로 실행 중이면 Docker와 충돌합니다.
> `brew services stop postgresql@16` 으로 중지하거나 docker-compose.yml에서 포트를 변경하세요.

---

## 1. 환경변수 설정

```bash
cd /Users/dohee/Documents/workspace/project/mock-exchange

# .env 파일이 없으면 복사
cp .env.example .env
```

## 2. 인프라 실행 (Docker)

```bash
# PostgreSQL, Redis, Kafka 컨테이너 시작
docker compose up -d postgres redis kafka

# 상태 확인 (모두 healthy 상태가 될 때까지 대기)
docker ps
```

## 3. 의존성 설치 + 빌드

```bash
pnpm install
npx turbo build
```

## 4. DB 마이그레이션 (최초 1회)

```bash
# 환경변수 로드
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# 각 서비스 Prisma DB push
cd backend/services/user-auth && npx prisma db push && cd ../../..
cd backend/services/market-data && npx prisma db push && cd ../../..
cd backend/services/order-engine && npx prisma db push && cd ../../..
cd backend/services/portfolio && npx prisma db push && cd ../../..
```

## 5. Kafka 토픽 생성 (최초 1회)

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

## 6. 백엔드 서비스 실행

**각각 별도 터미널**에서 실행합니다. 모든 터미널에서 먼저 환경변수를 로드합니다:

```bash
cd /Users/dohee/Documents/workspace/project/mock-exchange
export $(grep -v '^#' .env | grep -v '^$' | xargs)
```

### 터미널 1 - User Auth (3007)
```bash
node backend/services/user-auth/dist/main.js
```

### 터미널 2 - Market Data (3001)
```bash
node backend/services/market-data/dist/main.js
```

### 터미널 3 - Order Engine (3002)
```bash
node backend/services/order-engine/dist/main.js
```

### 터미널 4 - Portfolio (3003)
```bash
node backend/services/portfolio/dist/main.js
```

### 터미널 5 - API Gateway (3000)
```bash
node backend/services/api-gateway/dist/main.js
```

> **확인**: `curl http://localhost:3000/health/live` → `{"status":"ok"}`

## 7. 프론트엔드 실행

### 터미널 6
```bash
cd frontend
pnpm dev
```

## 8. 브라우저 접속

| URL | 설명 |
|---|---|
| http://localhost:4000 | 프론트엔드 (메인 화면) |
| http://localhost:4000/login | 로그인 |
| http://localhost:4000/register | 회원가입 |
| http://localhost:4000/portfolio | 포트폴리오 |
| http://localhost:4000/orders | 주문 내역 |
| http://localhost:4000/leaderboard | 리더보드 |
| http://localhost:4000/asset/BTC-USD | 종목 상세 (예시) |

## 종료

```bash
# 각 터미널에서 Ctrl+C로 서비스 종료

# Docker 인프라 종료
docker compose down

# 로컬 PostgreSQL 다시 시작 (필요 시)
brew services start postgresql@16
```

## 서비스 포트 정리

| 서비스 | 포트 | 설명 |
|---|---|---|
| Frontend (Next.js) | 4000 | 웹 UI |
| API Gateway | 3000 | 프록시 + WebSocket |
| Market Data | 3001 | 시세/차트 데이터 |
| Order Engine | 3002 | 주문 매칭 |
| Portfolio | 3003 | 잔고/보유자산 |
| Notification | 3004 | 알림 |
| Chat | 3005 | 채팅 |
| AI Service | 3006 | AI |
| User Auth | 3007 | 인증 |
| PostgreSQL | 5432 | DB (Docker) |
| Redis | 6379 | 캐시 (Docker) |
| Kafka | 9092 | 메시지 브로커 (Docker) |
