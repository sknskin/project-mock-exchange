#!/bin/bash
# ===========================================
# VirtuEx - PostgreSQL Database Backup Script
# ===========================================
# Usage: ./scripts/backup-db.sh
# Creates gzipped pg_dump backups for all service databases
# and retains the most recent 7 per database.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
MAX_BACKUPS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# All VirtuEx databases
DATABASES=("mockexchange" "mex_auth" "mex_orders" "mex_portfolio" "mex_market" "mex_chat")

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup for ${#DATABASES[@]} databases..."

FAILED=0
for DB_NAME in "${DATABASES[@]}"; do
  BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

  echo "[$(date)] Backing up: $DB_NAME"

  if PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD env required}" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE"; then
    FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)]   OK: $BACKUP_FILE ($FILESIZE)"
  else
    echo "[$(date)]   ERROR: Failed to backup $DB_NAME"
    rm -f "$BACKUP_FILE"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Delete old backups - keep only recent MAX_BACKUPS
  BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/${DB_NAME}_*.sql.gz 2>/dev/null | wc -l)
  if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    echo "[$(date)]   Removing $DELETE_COUNT old backup(s) for $DB_NAME"
    ls -1t "${BACKUP_DIR}"/${DB_NAME}_*.sql.gz | tail -n "$DELETE_COUNT" | xargs rm -f
  fi
done

echo ""
echo "[$(date)] Backup complete. Failed: $FAILED / ${#DATABASES[@]}"
echo "[$(date)] Current backups:"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null || echo "  (none)"
