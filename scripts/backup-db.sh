#!/bin/bash
# ===========================================
# VirtuEx - PostgreSQL Database Backup Script
# ===========================================
# Usage: ./scripts/backup-db.sh
# Creates gzipped pg_dump backups and retains the most recent 7.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-mockexchange}"
MAX_BACKUPS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# 백업 디렉토리 생성 (Create backup directory)
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# pg_dump + gzip
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup completed: $BACKUP_FILE ($FILESIZE)"
else
  echo "[$(date)] ERROR: Backup failed!"
  exit 1
fi

# 오래된 백업 삭제 - 최근 MAX_BACKUPS개만 보존 (Delete old backups - keep only recent MAX_BACKUPS)
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/${POSTGRES_DB}_*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
  echo "[$(date)] Removing $DELETE_COUNT old backup(s)..."
  ls -1t "${BACKUP_DIR}"/${POSTGRES_DB}_*.sql.gz | tail -n "$DELETE_COUNT" | xargs rm -f
fi

echo "[$(date)] Backup rotation complete. Current backups:"
ls -lh "${BACKUP_DIR}"/${POSTGRES_DB}_*.sql.gz 2>/dev/null || echo "  (none)"
