#!/bin/bash
#
# ============================================================================
# [VirtuEx] VirtuEx - 전체 서비스 일괄 실행 스크립트
# [VirtuEx] VirtuEx - Full Service Startup Script
# ============================================================================
#
# [사용법 / Usage]
#   프로젝트 루트 디렉토리에서 실행합니다.
#   Run this script from the project root directory.
#
#   cd /Users/dohee/Documents/workspace/project/project-virtuex
#   bash scripts/start-all.sh
#
#   또는 어디서든 절대 경로로 실행 가능:
#   Or run from anywhere with an absolute path:
#
#   bash /Users/dohee/Documents/workspace/project/project-virtuex/scripts/start-all.sh
#
# [사전 요구사항 / Prerequisites]
#   - Node.js (v20+)
#   - pnpm (npm i -g pnpm)
#   - Docker Desktop (실행 중이어야 합니다 / must be running)
#   - macOS (brew 사용 — 다른 OS는 PostgreSQL 중지 로직 수정 필요)
#
# [실행 순서 / Execution Order]
#   0. 기존 서비스 프로세스 종료 / Kill existing service processes
#   1. 사전 체크 (Node, pnpm, Docker) / Prerequisite checks
#   2. 환경변수 로드 (.env) / Load environment variables
#   3. Docker 인프라 시작 (PostgreSQL, Redis, Kafka) / Start Docker infra
#   4. Kafka 토픽 생성 / Create Kafka topics
#   5. TypeScript 빌드 확인 / Build check (frontend + backend)
#   6. Prisma DB 마이그레이션 / Database migration
#   7. 백엔드 + API Gateway + 프론트엔드 시작 / Start all services
#
# [종료 방법 / How to Stop]
#   Ctrl+C를 누르면 모든 서비스가 자동 종료됩니다.
#   Press Ctrl+C to gracefully stop all services.
#   Docker 인프라 종료: docker compose down
#   로컬 PostgreSQL 복구: brew services start postgresql@16
#
# [포트 목록 / Port Map]
#   - 4000: 프론트엔드 (Next.js dev server) / Frontend
#   - 3000: API Gateway / API Gateway
#   - 3001: Market Data 서비스 / Market Data service
#   - 3002: Order Engine 서비스 / Order Engine service
#   - 3003: Portfolio 서비스 / Portfolio service
#   - 3004: Notification 서비스 / Notification service
#   - 3005: Chat 서비스 / Chat service
#   - 3006: AI Service / AI Service
#   - 3007: User Auth 서비스 / User Auth service
#   - 5432: PostgreSQL (Docker) / PostgreSQL
#   - 6379: Redis (Docker) / Redis
#   - 9092: Kafka (Docker) / Kafka
#
# [로그 확인 / Checking Logs]
#   각 서비스의 로그는 logs/ 디렉토리에 저장됩니다.
#   Service logs are saved in the logs/ directory.
#
#   tail -f logs/frontend.log      # 프론트엔드 / Frontend
#   tail -f logs/api-gateway.log   # API Gateway
#   tail -f logs/market-data.log   # Market Data
#   tail -f logs/user-auth.log     # User Auth
#   tail -f logs/order-engine.log  # Order Engine
#   tail -f logs/portfolio.log     # Portfolio
#   tail -f logs/notification.log  # Notification
#   tail -f logs/chat.log          # Chat
#   tail -f logs/ai-service.log    # AI Service
#
# ============================================================================

# 오류 발생 시 즉시 중단 (파이프라인 내부 명령 제외)
# Exit immediately on error (except within pipelines)
set -e

# ─────────────────────────────────────────────────
# 프로젝트 루트 경로 계산 (스크립트 위치 기준 한 단계 상위)
# Compute project root directory (one level above the script location)
# ─────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ─────────────────────────────────────────────────
# 터미널 출력용 ANSI 색상 코드 정의
# Define ANSI color codes for terminal output
# ─────────────────────────────────────────────────
RED='\033[0;31m'      # 오류/종료 / Error/Stop
GREEN='\033[0;32m'    # 성공 / Success
YELLOW='\033[1;33m'   # 경고/단계 / Warning/Step
CYAN='\033[0;36m'     # 정보/타이틀 / Info/Title
NC='\033[0m'          # 색상 리셋 / Reset color

# 백그라운드 서비스 PID와 이름을 저장하는 배열
# Arrays to track background service PIDs and their names
PIDS=()
NAMES=()

# ─────────────────────────────────────────────────
# cleanup: Ctrl+C(SIGINT) 또는 SIGTERM 수신 시 모든 백그라운드 서비스를 종료하는 함수
# cleanup: Gracefully stop all background services on SIGINT/SIGTERM
# ─────────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}[종료 / Shutdown] 모든 서비스를 중지합니다... / Stopping all services...${NC}"

  # 등록된 모든 PID에 SIGTERM 전송
  # Send SIGTERM to all registered PIDs
  for i in "${!PIDS[@]}"; do
    if kill -0 "${PIDS[$i]}" 2>/dev/null; then
      kill "${PIDS[$i]}" 2>/dev/null
      echo -e "  ${RED}✗${NC} ${NAMES[$i]} (PID ${PIDS[$i]}) 종료 / stopped"
    fi
  done

  # 모든 자식 프로세스가 종료될 때까지 대기
  # Wait for all child processes to exit
  wait 2>/dev/null

  echo ""
  echo -e "${YELLOW}Docker 인프라 종료 중... / Stopping Docker infrastructure...${NC}"
  docker compose down 2>/dev/null || true
  echo -e "  ${GREEN}✓${NC} Docker 컨테이너 종료 완료 / Docker containers stopped"

  echo -e "${YELLOW}로컬 PostgreSQL 복구 중... / Restoring local PostgreSQL...${NC}"
  brew services start postgresql@16 2>/dev/null || true
  echo -e "  ${GREEN}✓${NC} 로컬 PostgreSQL 복구 완료 / Local PostgreSQL restored"

  echo ""
  echo -e "${YELLOW}서비스가 모두 종료되었습니다. / All services stopped.${NC}"
  exit 0
}

# SIGINT(Ctrl+C), SIGTERM 시그널에 cleanup 함수 연결
# Register cleanup function for SIGINT (Ctrl+C) and SIGTERM signals
trap cleanup SIGINT SIGTERM

# ─────────────────────────────────────────────────
# start_service: 지정된 명령어를 백그라운드로 실행하고 PID를 기록하는 함수
# start_service: Run a command in the background and record its PID
#   $1 = 서비스 이름 / service name (e.g. "user-auth")
#   $2 = 실행 명령어 / command to run (e.g. "node backend/services/user-auth/dist/main.js")
# ─────────────────────────────────────────────────
start_service() {
  local name=$1
  local cmd=$2
  local log_file="$ROOT_DIR/logs/${name}.log"

  # logs 디렉토리가 없으면 생성 / Create logs directory if not exists
  mkdir -p "$ROOT_DIR/logs"

  # 백그라운드 실행, stdout/stderr를 로그 파일로 리다이렉트
  # Run in background, redirect stdout/stderr to log file
  $cmd > "$log_file" 2>&1 &
  local pid=$!

  # PID와 이름을 배열에 저장 (cleanup에서 사용)
  # Store PID and name in arrays (used by cleanup)
  PIDS+=($pid)
  NAMES+=("$name")
  echo -e "  ${GREEN}✓${NC} $name (PID $pid)"
}

# ─────────────────────────────────────────────────
# wait_for_port: 특정 포트가 LISTEN 상태가 될 때까지 대기하는 함수
# wait_for_port: Wait until a specific port is in LISTEN state
#   $1 = 포트 번호 / port number
#   $2 = 서비스 이름 / service name (for display)
#   $3 = 최대 대기 시간(초) / max wait time in seconds
# ─────────────────────────────────────────────────
wait_for_port() {
  local port=$1
  local name=$2
  local max_wait=$3
  local waited=0

  # lsof로 해당 포트가 LISTEN 상태인지 1초마다 확인
  # Check every second if the port is in LISTEN state using lsof
  while ! lsof -i :$port -sTCP:LISTEN >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ $waited -ge $max_wait ]; then
      echo -e "  ${RED}✗ $name (포트/port $port) 시작 실패 / failed to start - logs/${name}.log 확인${NC}"
      return 1
    fi
  done
  echo -e "  ${GREEN}✓${NC} $name (포트/port $port) 준비 완료 / ready"
  return 0
}

# ═════════════════════════════════════════════════
# 메인 실행 시작 / Main execution starts here
# ═════════════════════════════════════════════════

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  VirtuEx - 전체 서비스 실행${NC}"
echo -e "${CYAN}  VirtuEx - Full Service Startup${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# ─── 0. 기존 서비스 프로세스 종료 / Kill existing service processes ───
# 이전 실행에서 남아있는 프로세스가 포트를 점유하고 있을 수 있으므로 정리
# Clean up leftover processes from previous runs that may occupy ports
# 모든 마이크로서비스 + API Gateway + 프론트엔드 포트 목록
# All microservice + API Gateway + Frontend ports
SERVICE_PORTS="3000 3001 3002 3003 3004 3005 3006 3007 4000"
EXISTING_PIDS=$(lsof -ti :$(echo $SERVICE_PORTS | tr ' ' ',') 2>/dev/null || true)
if [ -n "$EXISTING_PIDS" ]; then
  echo -e "${YELLOW}[0] 기존 서비스 프로세스 종료 중... / Killing existing service processes...${NC}"
  echo "$EXISTING_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
  echo -e "  ${GREEN}✓${NC} 기존 프로세스 종료 완료 / Existing processes killed (포트/ports: $SERVICE_PORTS)"
  echo ""
fi

# ─── 1. 사전 체크 / Prerequisite checks ───
# Node.js, pnpm, Docker가 설치되어 있는지 확인
# Verify Node.js, pnpm, and Docker are installed
echo -e "${YELLOW}[1/7] 사전 체크... / Prerequisite checks...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js가 필요합니다 / Node.js is required${NC}"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}pnpm이 필요합니다 / pnpm is required (npm i -g pnpm)${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker가 필요합니다 / Docker is required${NC}"; exit 1; }

# 로컬 PostgreSQL 충돌 방지: Docker PostgreSQL이 5432를 사용하므로 로컬 postgres를 중지
# Prevent local PostgreSQL conflict: Docker uses port 5432, so stop local postgres
if lsof -i :5432 -sTCP:LISTEN 2>/dev/null | grep -v docker | grep -q postgres; then
  echo -e "  ${YELLOW}⚠ 로컬 PostgreSQL이 5432 포트를 사용 중 → 자동 중지합니다${NC}"
  echo -e "  ${YELLOW}⚠ Local PostgreSQL occupying port 5432 → auto-stopping${NC}"
  brew services stop postgresql@16 2>/dev/null || true
  sleep 2
  echo -e "  ${GREEN}✓${NC} 로컬 PostgreSQL 중지됨 / Local PostgreSQL stopped"
  echo -e "    (복구 / restore: brew services start postgresql@16)"
fi

echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
echo -e "  ${GREEN}✓${NC} pnpm $(pnpm -v)"

# ─── 2. 환경변수 로드 / Load environment variables ───
# .env 파일이 없으면 .env.example에서 복사 후, 환경변수를 현재 셸에 로드
# If .env doesn't exist, copy from .env.example, then source all variables
echo ""
echo -e "${YELLOW}[2/7] 환경변수 로드... / Loading environment variables...${NC}"

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "  ${GREEN}✓${NC} .env 생성됨 / .env created (from .env.example)"
fi

# set -a: 이후 정의되는 변수를 자동으로 export (bash는 # 주석을 자체 처리)
# set -a: automatically export all subsequent variable definitions (bash handles # comments natively)
set -a
source "$ROOT_DIR/.env"
set +a
echo -e "  ${GREEN}✓${NC} .env 로드 완료 / .env loaded"

# ─── 3. Docker 인프라 시작 / Start Docker infrastructure ───
# PostgreSQL, Redis, Kafka 컨테이너를 docker-compose로 시작하고 healthy 상태까지 대기
# Start PostgreSQL, Redis, Kafka containers via docker-compose and wait until healthy
echo ""
echo -e "${YELLOW}[3/7] Docker 인프라 시작... / Starting Docker infrastructure...${NC}"

docker compose up -d postgres redis kafka

echo "  컨테이너 healthy 대기 중... / Waiting for containers to become healthy..."

# 최대 30초간 모든 컨테이너가 healthy 상태가 될 때까지 폴링
# Poll up to 30 seconds until all containers report healthy status
for i in $(seq 1 30); do
  pg_ok=$(docker inspect --format='{{.State.Health.Status}}' mex-postgres 2>/dev/null || echo "starting")
  redis_ok=$(docker inspect --format='{{.State.Health.Status}}' mex-redis 2>/dev/null || echo "starting")
  kafka_ok=$(docker inspect --format='{{.State.Health.Status}}' mex-kafka 2>/dev/null || echo "starting")
  if [ "$pg_ok" = "healthy" ] && [ "$redis_ok" = "healthy" ] && [ "$kafka_ok" = "healthy" ]; then
    break
  fi
  sleep 1
done

echo -e "  ${GREEN}✓${NC} PostgreSQL (5432)"
echo -e "  ${GREEN}✓${NC} Redis (6379)"
echo -e "  ${GREEN}✓${NC} Kafka (9092)"

# ─── 4. Kafka 토픽 생성 / Create Kafka topics ───
# 서비스 간 이벤트 통신에 필요한 Kafka 토픽을 생성 (이미 존재하면 스킵)
# Create Kafka topics needed for inter-service event communication (skip if exists)
echo ""
echo -e "${YELLOW}[4/7] Kafka 토픽 생성... / Creating Kafka topics...${NC}"

for topic in market.prices.updated orders.events trades.executed portfolio.events; do
  docker exec mex-kafka /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server localhost:9092 \
    --create --if-not-exists \
    --topic "$topic" --partitions 3 2>/dev/null
  echo -e "  ${GREEN}✓${NC} $topic"
done

# ─── 5. 빌드 체크 / Build check ───
# 매 실행 시 전체 빌드 수행: 소스 코드 변경이 항상 반영되도록 보장
# Always rebuild on every run: ensures source code changes are always reflected
echo ""
echo -e "${YELLOW}[5/7] 빌드... / Building...${NC}"

# tsbuildinfo 정리: TypeScript incremental 빌드 캐시가 stale할 수 있으므로 삭제
# Clean stale tsbuildinfo: prevents stale incremental build cache
find backend -name "tsconfig.tsbuildinfo" -delete 2>/dev/null || true

# Next.js 캐시 정리: stale 웹팩 캐시로 인한 런타임 오류 방지
# Clean Next.js cache: prevents runtime errors from stale webpack cache
rm -rf frontend/.next 2>/dev/null || true

# 의존성 설치 (lockfile 우선, 실패 시 일반 install)
# Install dependencies (prefer frozen lockfile, fallback to regular install)
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# --force: turbo 캐시를 무시하고 전체 재빌드
# --force: ignore turbo cache and rebuild everything
npx turbo build --force

echo -e "  ${GREEN}✓${NC} 빌드 완료 / Build complete"

# ─── 6. DB 마이그레이션 / Database migration ───
# 각 서비스의 Prisma 스키마를 데이터베이스에 동기화
# Prisma db push: schema.prisma를 기준으로 DB 스키마를 갱신 (마이그레이션 파일 없이)
# Sync each service's Prisma schema to the database
# prisma db push: update DB schema based on schema.prisma (without migration files)
echo ""
echo -e "${YELLOW}[6/7] DB 마이그레이션... / Running DB migrations...${NC}"

# set +e: 개별 마이그레이션 실패가 전체 스크립트를 중단하지 않도록
# set +e: prevent individual migration failures from stopping the entire script
#
# ⚠️ 주의: --accept-data-loss 플래그를 사용하지 않습니다.
#    스키마 변경이 기존 데이터와 충돌하면 수동 마이그레이션이 필요합니다.
#    데이터 초기화가 필요한 경우에만 수동으로 --force-reset을 실행하세요.
# ⚠️ Note: --accept-data-loss is NOT used to prevent accidental data loss.
#    If schema changes conflict with existing data, manual migration is required.
#    Only run --force-reset manually when data reset is explicitly intended.
set +e
for svc in user-auth market-data order-engine portfolio chat; do
  if [ -f "backend/services/$svc/prisma/schema.prisma" ]; then
    cd "backend/services/$svc"
    push_output=$(npx prisma db push --skip-generate 2>&1)
    push_exit=$?
    if [ $push_exit -eq 0 ]; then
      echo -e "  ${GREEN}✓${NC} $svc"
    else
      # 데이터 손실이 필요한 변경인 경우 경고만 출력하고 계속 진행
      # If the change requires data loss, warn and continue (don't auto-reset)
      echo -e "  ${YELLOW}⚠${NC} $svc (스키마 동기화 실패 — 기존 데이터 보호를 위해 건너뜀)"
      echo -e "    Schema sync failed — skipped to protect existing data"
      echo "    $push_output" | tail -3
      echo -e "    ${YELLOW}수동 처리가 필요합니다 / Manual intervention required${NC}"
    fi
    cd "$ROOT_DIR"
  fi
done
set -e

# ─── 7. 서비스 시작 / Start services ───
# 백엔드 4개 → API Gateway → 프론트엔드 순서로 시작
# 각 서비스가 포트를 열 때까지 대기 후 다음 단계 진행
# Start backend (4 services) → API Gateway → Frontend in order
# Wait for each service's port to become available before proceeding
echo ""
echo -e "${YELLOW}[7/7] 서비스 시작... / Starting services...${NC}"

# 백엔드 마이크로서비스 7개를 동시에 백그라운드 실행
# Start 7 backend microservices simultaneously in background
start_service "user-auth"    "node backend/services/user-auth/dist/main.js"
start_service "market-data"  "node backend/services/market-data/dist/main.js"
start_service "order-engine" "node backend/services/order-engine/dist/main.js"
start_service "portfolio"    "node backend/services/portfolio/dist/main.js"
start_service "notification" "node backend/services/notification/dist/main.js"
start_service "chat"         "node backend/services/chat/dist/main.js"
start_service "ai-service"   "node backend/services/ai-service/dist/main.js"

echo ""
echo "  백엔드 서비스 준비 대기 중... / Waiting for backend services..."

# 각 서비스가 지정된 포트에서 LISTEN할 때까지 최대 15초 대기
# Wait up to 15 seconds for each service to start listening on its port
wait_for_port 3007 "user-auth"    15
wait_for_port 3001 "market-data"  15
wait_for_port 3002 "order-engine" 15
wait_for_port 3003 "portfolio"    15
wait_for_port 3004 "notification" 15
wait_for_port 3005 "chat"         15

# ai-service는 API 키가 없을 수 있으므로 실패해도 계속 진행
# ai-service may fail if API key is not configured, continue regardless
wait_for_port 3006 "ai-service"   15 || echo -e "  ${YELLOW}⚠ ai-service 시작 실패 (API 키 설정 필요) / ai-service failed (API key required)${NC}"

# API Gateway는 백엔드 서비스가 모두 준비된 후 시작 (의존성 존재)
# Start API Gateway after all backend services are ready (has dependencies)
start_service "api-gateway"  "node backend/services/api-gateway/dist/main.js"
wait_for_port 3000 "api-gateway"  15

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  모든 서비스가 실행 중입니다${NC}"
echo -e "${CYAN}  All services are running${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "  ${GREEN}프론트엔드 / Frontend${NC}   http://localhost:4000"
echo -e "  ${GREEN}API Gateway${NC}             http://localhost:3000"
echo ""
echo -e "  로그 확인 / Logs: tail -f logs/{서비스명}.log"
echo -e "  종료 / Stop: ${RED}Ctrl+C${NC}"
echo ""

# 프론트엔드(Next.js dev server)를 백그라운드로 실행 (타임스탬프 추가)
# Start frontend (Next.js dev server) in background (with timestamps)
cd "$ROOT_DIR/frontend"
npx next dev --port 4000 2>&1 \
  | perl -MPOSIX -pe 'BEGIN{$|=1} $_ = strftime("[%Y. %m. %d. %H:%M:%S] ", localtime) . $_' \
  >> "$ROOT_DIR/logs/frontend.log" &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)
NAMES+=("frontend")

echo ""
echo "  프론트엔드 준비 대기 중... / Waiting for frontend..."
wait_for_port 4000 "frontend" 30

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  준비 완료! / Ready!${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "  ${GREEN}브라우저에서 열기 / Open in browser:${NC}  http://localhost:4000"
echo ""
echo -e "  로그 확인 / Logs:  tail -f logs/frontend.log"
echo -e "                     tail -f logs/api-gateway.log"
echo -e "  종료 / Stop:       ${RED}Ctrl+C${NC}"
echo ""

# ─────────────────────────────────────────────────
# 무한 루프: 모든 서비스가 백그라운드에서 실행 중이므로
# 스크립트가 종료되지 않도록 유지. 60초마다 각 서비스의 생존 여부를 확인.
# Ctrl+C(SIGINT)를 받으면 위의 trap → cleanup() 함수가 호출됨.
#
# Infinite loop: keeps the script alive while all services run in background.
# Every 60 seconds, checks if each service process is still alive.
# On Ctrl+C (SIGINT), the trap above calls cleanup() to stop all services.
# ─────────────────────────────────────────────────
while true; do
  sleep 60

  # 서비스 생존 체크: PID가 유효한지 확인
  # Health check: verify each PID is still running
  for i in "${!PIDS[@]}"; do
    if ! kill -0 "${PIDS[$i]}" 2>/dev/null; then
      echo -e "  ${RED}✗ ${NAMES[$i]} (PID ${PIDS[$i]}) 가 종료되었습니다 / has stopped. logs/${NAMES[$i]}.log 확인${NC}"
    fi
  done
done
