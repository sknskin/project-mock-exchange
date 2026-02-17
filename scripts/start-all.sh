#!/bin/bash
#
# Mock Exchange - 전체 서비스 한 번에 실행
# 사용법: bash scripts/start-all.sh
#

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PIDS=()
NAMES=()

cleanup() {
  echo ""
  echo -e "${YELLOW}[종료] 모든 서비스를 중지합니다...${NC}"
  for i in "${!PIDS[@]}"; do
    if kill -0 "${PIDS[$i]}" 2>/dev/null; then
      kill "${PIDS[$i]}" 2>/dev/null
      echo -e "  ${RED}✗${NC} ${NAMES[$i]} (PID ${PIDS[$i]}) 종료"
    fi
  done
  wait 2>/dev/null
  echo ""
  echo -e "${YELLOW}서비스가 모두 종료되었습니다.${NC}"
  echo -e "${YELLOW}Docker 인프라를 종료하려면: docker compose down${NC}"
  echo -e "${YELLOW}로컬 PostgreSQL 복구: brew services start postgresql@16${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

start_service() {
  local name=$1
  local cmd=$2
  local log_file="$ROOT_DIR/logs/${name}.log"

  mkdir -p "$ROOT_DIR/logs"
  $cmd > "$log_file" 2>&1 &
  local pid=$!
  PIDS+=($pid)
  NAMES+=("$name")
  echo -e "  ${GREEN}✓${NC} $name (PID $pid)"
}

wait_for_port() {
  local port=$1
  local name=$2
  local max_wait=$3
  local waited=0
  while ! lsof -i :$port -sTCP:LISTEN >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ $waited -ge $max_wait ]; then
      echo -e "  ${RED}✗ $name (포트 $port) 시작 실패 - logs/${name}.log 확인${NC}"
      return 1
    fi
  done
  echo -e "  ${GREEN}✓${NC} $name (포트 $port) 준비 완료"
  return 0
}

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  Mock Exchange - 전체 서비스 실행${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# ─── 1. 사전 체크 ───
echo -e "${YELLOW}[1/7] 사전 체크...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js가 필요합니다${NC}"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}pnpm이 필요합니다 (npm i -g pnpm)${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker가 필요합니다${NC}"; exit 1; }

# 로컬 PostgreSQL 체크 (Docker가 아닌 로컬 postgres 프로세스만 감지)
if lsof -i :5432 -sTCP:LISTEN 2>/dev/null | grep -v docker | grep -q postgres; then
  echo -e "  ${YELLOW}⚠ 로컬 PostgreSQL이 5432 포트를 사용 중 → 자동 중지합니다${NC}"
  brew services stop postgresql@16 2>/dev/null || true
  sleep 2
  echo -e "  ${GREEN}✓${NC} 로컬 PostgreSQL 중지됨 (종료 후 brew services start postgresql@16 으로 복구)"
fi

echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
echo -e "  ${GREEN}✓${NC} pnpm $(pnpm -v)"

# ─── 2. 환경변수 ───
echo ""
echo -e "${YELLOW}[2/7] 환경변수 로드...${NC}"

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "  ${GREEN}✓${NC} .env 생성됨 (.env.example 복사)"
fi

set -a
source <(grep -v '^#' .env | grep -v '^$')
set +a
echo -e "  ${GREEN}✓${NC} .env 로드 완료"

# ─── 3. Docker 인프라 ───
echo ""
echo -e "${YELLOW}[3/7] Docker 인프라 시작...${NC}"

docker compose up -d postgres redis kafka

echo "  컨테이너 healthy 대기 중..."
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

# ─── 4. Kafka 토픽 ───
echo ""
echo -e "${YELLOW}[4/7] Kafka 토픽 생성...${NC}"

for topic in price.updated order.events trade.events portfolio.events; do
  docker exec mex-kafka /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server localhost:9092 \
    --create --if-not-exists \
    --topic "$topic" --partitions 3 2>/dev/null
  echo -e "  ${GREEN}✓${NC} $topic"
done

# ─── 5. 빌드 체크 ───
echo ""
echo -e "${YELLOW}[5/7] 빌드 확인...${NC}"

need_build=false

if [ ! -d "frontend/.next" ]; then
  need_build=true
fi

for svc in user-auth market-data order-engine portfolio api-gateway; do
  if [ ! -f "backend/services/$svc/dist/main.js" ]; then
    need_build=true
    break
  fi
done

if [ "$need_build" = true ]; then
  echo "  빌드가 필요합니다. 빌드 중..."
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  npx turbo build
  echo -e "  ${GREEN}✓${NC} 빌드 완료"
else
  echo -e "  ${GREEN}✓${NC} 빌드 파일 존재 (스킵)"
fi

# ─── 6. DB 마이그레이션 ───
echo ""
echo -e "${YELLOW}[6/7] DB 마이그레이션...${NC}"

set +e
for svc in user-auth market-data order-engine portfolio; do
  if [ -f "backend/services/$svc/prisma/schema.prisma" ]; then
    cd "backend/services/$svc"
    if npx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -1; then
      echo -e "  ${GREEN}✓${NC} $svc"
    else
      echo -e "  ${YELLOW}⚠${NC} $svc (이미 최신이거나 경고 발생)"
    fi
    cd "$ROOT_DIR"
  fi
done
set -e

# ─── 7. 서비스 시작 ───
echo ""
echo -e "${YELLOW}[7/7] 서비스 시작...${NC}"

start_service "user-auth"    "node backend/services/user-auth/dist/main.js"
start_service "market-data"  "node backend/services/market-data/dist/main.js"
start_service "order-engine" "node backend/services/order-engine/dist/main.js"
start_service "portfolio"    "node backend/services/portfolio/dist/main.js"

echo ""
echo "  백엔드 서비스 준비 대기 중..."
wait_for_port 3007 "user-auth"    15
wait_for_port 3001 "market-data"  15
wait_for_port 3002 "order-engine" 15
wait_for_port 3003 "portfolio"    15

start_service "api-gateway"  "node backend/services/api-gateway/dist/main.js"
wait_for_port 3000 "api-gateway"  15

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  모든 서비스가 실행 중입니다${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "  ${GREEN}프론트엔드${NC}    http://localhost:4000"
echo -e "  ${GREEN}API Gateway${NC}   http://localhost:3000"
echo ""
echo -e "  로그 확인: tail -f logs/{서비스명}.log"
echo -e "  종료: ${RED}Ctrl+C${NC}"
echo ""

# 프론트엔드도 백그라운드로 실행
cd "$ROOT_DIR/frontend"
npx next dev --port 4000 >> "$ROOT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)
NAMES+=("frontend")

echo ""
echo "  프론트엔드 준비 대기 중..."
wait_for_port 4000 "frontend" 30

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  준비 완료!${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "  ${GREEN}브라우저에서 열기:${NC}  http://localhost:4000"
echo ""
echo -e "  로그 확인:  tail -f logs/frontend.log"
echo -e "              tail -f logs/api-gateway.log"
echo -e "  종료:       ${RED}Ctrl+C${NC}"
echo ""

# 모든 서비스가 백그라운드이므로 wait로 대기
wait
