#!/bin/bash
set -e

echo "========================================="
echo "  Mock Exchange - Development Setup"
echo "========================================="

# Check prerequisites
echo ""
echo "[1/6] Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Run: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Error: Docker is required. Install from https://docker.com"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ required (found v$(node -v))"
  exit 1
fi

echo "  Node.js $(node -v) ✓"
echo "  pnpm $(pnpm -v) ✓"
echo "  Docker $(docker --version | cut -d' ' -f3 | tr -d ',') ✓"

# Copy env file
echo ""
echo "[2/6] Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created .env from .env.example"
  echo "  >>> Review and update .env if needed <<<"
else
  echo "  .env already exists, skipping"
fi

# Install dependencies
echo ""
echo "[3/6] Installing dependencies..."
pnpm install

# Start infrastructure
echo ""
echo "[4/6] Starting infrastructure (PostgreSQL, Redis, Kafka)..."
docker compose up -d postgres redis kafka

echo "  Waiting for services to be healthy..."
sleep 10

# Check health
docker compose ps

# Generate Prisma clients and run migrations
echo ""
echo "[5/6] Setting up databases..."
for dir in services/*/; do
  if [ -f "$dir/prisma/schema.prisma" ]; then
    service_name=$(basename "$dir")
    echo "  Generating Prisma client for $service_name..."
    cd "$dir" && npx prisma generate && cd ../..
  fi
done

# Build shared packages
echo ""
echo "[6/6] Building shared packages..."
pnpm turbo run build --filter='./packages/*'

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "  Infrastructure running:"
echo "    PostgreSQL: localhost:5432"
echo "    Redis:      localhost:6379"
echo "    Kafka:      localhost:9092"
echo ""
echo "  Next steps:"
echo "    1. Run Kafka topic creation:"
echo "       docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --create ..."
echo "       OR: bash infrastructure/docker/kafka/create-topics.sh"
echo ""
echo "    2. Run database migrations:"
echo "       cd services/user-auth && pnpm db:migrate"
echo ""
echo "    3. Start services in dev mode:"
echo "       pnpm dev"
echo ""
echo "    4. (Optional) Start dev tools:"
echo "       docker compose --profile tools up -d"
echo "       PgAdmin:          http://localhost:5050"
echo "       Kafka UI:         http://localhost:8080"
echo "       Redis Commander:  http://localhost:8081"
echo ""
