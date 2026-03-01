#!/bin/bash
# ============================================================================
# [VirtuEx] 로그 로테이션 배치
# [VirtuEx] Log Rotation Batch
# ============================================================================
#
# 매일 자정 00:30에 실행하여 어제까지의 로그를 삭제하고 오늘 로그만 보존합니다.
# 서비스를 잠시 중지 후 재시작합니다 (약 3초 다운타임).
#
# Runs daily at 00:30. Removes logs up to yesterday, keeping only today's entries.
# Briefly stops and restarts services (~3 seconds downtime).
#
# [사용법 / Usage]
#   수동 실행 / Manual run:
#     bash scripts/rotate-logs.sh
#
#   크론 등록 / Cron setup (매일 자정 00:30):
#     crontab -e
#     30 0 * * * /Users/dohee/Documents/workspace/project/project-virtuex/scripts/rotate-logs.sh > /dev/null 2>&1
#
#   크론 비활성화 / Disable cron:
#     crontab -l | grep -v 'rotate-logs' | crontab -
#
#   크론 재활성화 / Re-enable cron:
#     (crontab -l 2>/dev/null; echo "30 0 * * * /Users/dohee/Documents/workspace/project/project-virtuex/scripts/rotate-logs.sh > /dev/null 2>&1") | crontab -
#
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
ROTATE_LOG="$LOG_DIR/rotate.log"

mkdir -p "$LOG_DIR"

# 로그 함수: rotate.log에 기록 + 터미널 출력
# Log function: writes to rotate.log + terminal output
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$ROTATE_LOG"
}

# 로그 타임스탬프의 날짜 패턴 (예: 2026. 03. 01.)
# Log timestamp date pattern (e.g., 2026. 03. 01.)
# 백엔드: NestJS 자체 타임스탬프 / 프론트엔드: start-all.sh에서 perl로 추가
# Backend: NestJS native timestamps / Frontend: added by start-all.sh via perl
TODAY=$(date '+%Y. %m. %d.')

log "==========================================="
log "로그 로테이션 시작 (Log rotation started)"
log "보존 대상 날짜: $TODAY"
log "==========================================="

# ─── 실행 중인 서비스 확인 / Check running services ───
BACKEND_PORTS="3000 3001 3002 3003 3004 3005 3006 3007"
RUNNING_PIDS=$(lsof -ti :$(echo $BACKEND_PORTS | tr ' ' ',') 2>/dev/null || true)
FRONTEND_PID=$(lsof -ti :4000 2>/dev/null || true)

if [ -z "$RUNNING_PIDS" ] && [ -z "$FRONTEND_PID" ]; then
  log "서비스가 실행 중이지 않습니다. 로그 파일만 정리합니다."
  log "(No services running. Cleaning log files only.)"
  for logfile in "$LOG_DIR"/*.log; do
    [ -f "$logfile" ] || continue
    fname=$(basename "$logfile")
    [[ "$fname" == "rotate.log" ]] && continue

    tmpfile=$(mktemp)
    grep -F "$TODAY" "$logfile" > "$tmpfile" 2>/dev/null || true
    old_lines=$(wc -l < "$logfile" | tr -d ' ')
    new_lines=$(wc -l < "$tmpfile" | tr -d ' ')
    cat "$tmpfile" > "$logfile"
    rm -f "$tmpfile"
    log "  $fname: ${old_lines}줄 → ${new_lines}줄"
  done
  log "로그 로테이션 완료"
  exit 0
fi

# ─── 1단계: 오늘 로그 추출 / Step 1: Extract today's logs ───
log "[1/5] 오늘 로그 추출 중..."

TMPDIR_ROTATE=$(mktemp -d)

for logfile in "$LOG_DIR"/*.log; do
  [ -f "$logfile" ] || continue
  fname=$(basename "$logfile")
  [[ "$fname" == "rotate.log" ]] && continue

  tmpfile="$TMPDIR_ROTATE/$fname"

  grep -F "$TODAY" "$logfile" > "$tmpfile" 2>/dev/null || true

  old_lines=$(wc -l < "$logfile" | tr -d ' ')
  new_lines=$(wc -l < "$tmpfile" | tr -d ' ')
  log "  $fname: ${old_lines}줄 → ${new_lines}줄 (오늘분 보존)"
done

# ─── 2단계: 서비스 중지 / Step 2: Stop services ───
log "[2/5] 서비스 중지 중..."

if [ -n "$FRONTEND_PID" ]; then
  kill $FRONTEND_PID 2>/dev/null || true
  log "  frontend 중지 (PID $FRONTEND_PID)"
fi

if [ -n "$RUNNING_PIDS" ]; then
  echo "$RUNNING_PIDS" | xargs kill 2>/dev/null || true
  log "  백엔드 서비스 중지 ($(echo $RUNNING_PIDS | wc -w | tr -d ' ')개 프로세스)"
fi

sleep 2

# ─── 3단계: 로그 파일 교체 / Step 3: Replace log files ───
log "[3/5] 로그 파일 교체 중..."

for logfile in "$LOG_DIR"/*.log; do
  [ -f "$logfile" ] || continue
  fname=$(basename "$logfile")
  [[ "$fname" == "rotate.log" ]] && continue

  tmpfile="$TMPDIR_ROTATE/$fname"
  if [ -f "$tmpfile" ]; then
    cat "$tmpfile" > "$logfile"
  fi
done

rm -rf "$TMPDIR_ROTATE"
log "  로그 파일 교체 완료"

# ─── 4단계: 서비스 재시작 / Step 4: Restart services ───
log "[4/5] 서비스 재시작 중..."

# 환경변수 로드 / Load environment variables
set +u
set -a
source "$PROJECT_DIR/.env" 2>/dev/null || true
set +a
set -u

# 백엔드 서비스 (>> 사용으로 O_APPEND 보장 — 다음 로테이션 시 안전)
# Backend services (>> for O_APPEND — safe for future rotations)
for entry in \
  "user-auth:backend/services/user-auth/dist/main.js" \
  "market-data:backend/services/market-data/dist/main.js" \
  "order-engine:backend/services/order-engine/dist/main.js" \
  "portfolio:backend/services/portfolio/dist/main.js" \
  "notification:backend/services/notification/dist/main.js" \
  "chat:backend/services/chat/dist/main.js" \
  "ai-service:backend/services/ai-service/dist/main.js" \
  "api-gateway:backend/services/api-gateway/dist/main.js"
do
  name="${entry%%:*}"
  path="${entry##*:}"
  nohup node "$PROJECT_DIR/$path" >> "$LOG_DIR/${name}.log" 2>&1 &
  log "  $name 시작 (PID $!)"
done

# 프론트엔드 (실행 중이었던 경우에만 재시작)
# Frontend (restart only if it was running)
if [ -n "$FRONTEND_PID" ]; then
  cd "$PROJECT_DIR/frontend"
  nohup bash -c "npx next dev --port 4000 2>&1 | perl -MPOSIX -pe 'BEGIN{\$|=1} \$_ = strftime(\"[%Y. %m. %d. %H:%M:%S] \", localtime) . \$_'" >> "$LOG_DIR/frontend.log" 2>&1 &
  log "  frontend 시작 (PID $!)"
  cd "$PROJECT_DIR"
fi

# ─── 5단계: 헬스 체크 / Step 5: Health check ───
log "[5/5] 서비스 정상 기동 확인 중... (3초 대기)"
sleep 3

ALL_OK=true
for entry in \
  "user-auth:3007:/health/live" \
  "market-data:3001:/health/live" \
  "order-engine:3002:/health/live" \
  "portfolio:3003:/health/live" \
  "notification:3004:/health/live" \
  "chat:3005:/health/live" \
  "ai-service:3006:/health/live" \
  "api-gateway:3000:/api/health/live"
do
  name="${entry%%:*}"
  rest="${entry#*:}"
  port="${rest%%:*}"
  health_path="${rest#*:}"

  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port$health_path" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    log "  ✓ $name (:$port)"
  else
    log "  ✗ $name (:$port) — HTTP $code"
    ALL_OK=false
  fi
done

log "==========================================="
if [ "$ALL_OK" = true ]; then
  log "로그 로테이션 완료 — 모든 서비스 정상"
else
  log "로그 로테이션 완료 — 일부 서비스 확인 필요"
fi
log "==========================================="
