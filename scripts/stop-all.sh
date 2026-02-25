#!/bin/bash
#
# ============================================================================
# [VirtuEx] VirtuEx - 전체 서비스 일괄 종료 스크립트
# [VirtuEx] VirtuEx - Full Service Shutdown Script
# ============================================================================
#
# [사용법 / Usage]
#   프로젝트 루트 디렉토리에서 실행합니다.
#   Run this script from the project root directory.
#
#   cd /Users/dohee/Documents/workspace/project/project-virtuex
#   bash scripts/stop-all.sh
#
# [종료 순서 / Shutdown Order]
#   1. 서비스 프로세스 종료 (프론트엔드 + API Gateway + 백엔드)
#   2. Docker 인프라 종료 (PostgreSQL, Redis, Kafka)
#   3. 로컬 PostgreSQL 복구
#
# ============================================================================

# ─────────────────────────────────────────────────
# 프로젝트 루트 경로 계산
# Compute project root directory
# ─────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ─────────────────────────────────────────────────
# ANSI 색상 코드
# ANSI color codes
# ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  VirtuEx - 전체 서비스 종료${NC}"
echo -e "${CYAN}  VirtuEx - Full Service Shutdown${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# ─── 1. 서비스 프로세스 종료 / Stop service processes ───
echo -e "${YELLOW}[1/3] 서비스 프로세스 종료 중... / Stopping service processes...${NC}"

SERVICE_PORTS="3000 3001 3002 3003 3007 4000"
EXISTING_PIDS=$(lsof -ti :$(echo $SERVICE_PORTS | tr ' ' ',') 2>/dev/null | sort -u || true)

if [ -n "$EXISTING_PIDS" ]; then
  echo "$EXISTING_PIDS" | xargs kill 2>/dev/null || true
  sleep 2

  # SIGTERM으로 종료되지 않은 프로세스가 있으면 SIGKILL
  # Force kill any remaining processes that didn't respond to SIGTERM
  REMAINING=$(lsof -ti :$(echo $SERVICE_PORTS | tr ' ' ',') 2>/dev/null | sort -u || true)
  if [ -n "$REMAINING" ]; then
    echo "$REMAINING" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi

  echo -e "  ${GREEN}✓${NC} 서비스 프로세스 종료 완료 / Service processes stopped (포트/ports: $SERVICE_PORTS)"
else
  echo -e "  ${GREEN}✓${NC} 실행 중인 서비스 없음 / No running services found"
fi

# ─── 2. Docker 인프라 종료 / Stop Docker infrastructure ───
echo ""
echo -e "${YELLOW}[2/3] Docker 인프라 종료 중... / Stopping Docker infrastructure...${NC}"

if docker compose ps --status running 2>/dev/null | grep -q "mex-"; then
  docker compose down 2>/dev/null
  echo -e "  ${GREEN}✓${NC} Docker 컨테이너 종료 완료 / Docker containers stopped"
else
  echo -e "  ${GREEN}✓${NC} 실행 중인 Docker 컨테이너 없음 / No running Docker containers"
fi

# ─── 3. 로컬 PostgreSQL 복구 / Restore local PostgreSQL ───
echo ""
echo -e "${YELLOW}[3/3] 로컬 PostgreSQL 복구 중... / Restoring local PostgreSQL...${NC}"

if brew services list 2>/dev/null | grep -q "postgresql@16"; then
  brew services start postgresql@16 2>/dev/null || true
  echo -e "  ${GREEN}✓${NC} 로컬 PostgreSQL 복구 완료 / Local PostgreSQL restored"
else
  echo -e "  ${GREEN}✓${NC} 로컬 PostgreSQL 서비스 없음 (건너뜀) / No local PostgreSQL service (skipped)"
fi

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  모든 서비스가 종료되었습니다${NC}"
echo -e "${CYAN}  All services stopped${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
