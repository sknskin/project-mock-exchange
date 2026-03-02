#!/bin/bash
# ===========================================
# VirtuEx - Old Data Cleanup Script
# ===========================================
# Deletes records older than RETENTION_DAYS (default: 90) from:
#   - PriceHistory (mex_market)
#   - LoginLog     (mex_auth)
#   - PageView     (mex_auth)
#
# Usage: ./scripts/cleanup-old-data.sh
#
# Cron example (daily at 4 AM):
#   0 4 * * * cd /path/to/project-virtuex && ./scripts/cleanup-old-data.sh >> logs/cleanup.log 2>&1

set -euo pipefail

RETENTION_DAYS="${RETENTION_DAYS:-90}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD env required}"

echo "[$(date)] Starting data cleanup (retention: ${RETENTION_DAYS} days)..."

# PriceHistory from market-data DB
DELETED=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d mex_market -t -c \
  "DELETE FROM \"price_histories\" WHERE \"created_at\" < NOW() - INTERVAL '${RETENTION_DAYS} days'; SELECT count(*) FROM (SELECT 1) t;" 2>/dev/null || echo "0")
echo "[$(date)]   PriceHistory: cleaned"

# LoginLog from auth DB
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d mex_auth -c \
  "DELETE FROM \"login_logs\" WHERE \"created_at\" < NOW() - INTERVAL '${RETENTION_DAYS} days';" 2>/dev/null
echo "[$(date)]   LoginLog: cleaned"

# PageView from auth DB
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d mex_auth -c \
  "DELETE FROM \"page_views\" WHERE \"created_at\" < NOW() - INTERVAL '${RETENTION_DAYS} days';" 2>/dev/null
echo "[$(date)]   PageView: cleaned"

echo "[$(date)] Data cleanup complete."
