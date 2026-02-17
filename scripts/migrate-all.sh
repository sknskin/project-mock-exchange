#!/bin/bash
set -e

echo "Running database migrations for all services..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

for dir in "$ROOT_DIR"/backend/services/*/; do
  if [ -f "$dir/prisma/schema.prisma" ]; then
    service_name=$(basename "$dir")
    echo ""
    echo "=== Migrating: $service_name ==="
    cd "$dir"
    npx prisma migrate dev --name init 2>/dev/null || npx prisma db push
    cd "$ROOT_DIR"
  fi
done

echo ""
echo "All migrations complete!"
