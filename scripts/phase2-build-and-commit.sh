#!/bin/bash
set -e

PROJECT_DIR="/Users/dohee/Documents/workspace/project/mock-exchange"
cd "$PROJECT_DIR"

echo "============================================"
echo "  Phase 2 - 빌드 검증 및 커밋"
echo "============================================"

# ── 1. 의존성 설치 ──
echo ""
echo "[1/5] 의존성 설치..."
pnpm install
echo "  OK 의존성 설치 완료"

# ── 2. Prisma Generate ──
echo ""
echo "[2/5] Prisma 클라이언트 생성..."
cd services/user-auth && npx prisma generate && cd "$PROJECT_DIR"
cd services/market-data && npx prisma generate && cd "$PROJECT_DIR"
cd services/order-engine && npx prisma generate && cd "$PROJECT_DIR"
cd services/portfolio && npx prisma generate && cd "$PROJECT_DIR"
echo "  OK 4개 서비스 Prisma 클라이언트 생성 완료"

# ── 3. 전체 빌드 ──
echo ""
echo "[3/5] 전체 빌드..."
pnpm turbo build
echo "  OK 전체 빌드 성공"

# ── 4. 커밋 ──
echo ""
echo "[4/5] Phase 2 변경사항 커밋..."

# dev 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "  현재 브랜치: $CURRENT_BRANCH -> dev로 전환"
    git checkout dev
fi

git add \
  packages/common/src/events/order.events.ts \
  services/market-data/src/domain/entities/asset.entity.ts \
  services/market-data/src/domain/services/price-engine.service.ts \
  services/api-gateway/src/gateway/gateway.module.ts \
  services/api-gateway/src/gateway/price-subscriber.service.ts \
  services/api-gateway/src/proxy/order-proxy.controller.ts \
  services/api-gateway/src/proxy/portfolio-proxy.controller.ts \
  services/order-engine/src/domain/aggregates/order.aggregate.ts \
  services/order-engine/src/domain/services/matching-engine.service.ts \
  services/order-engine/src/application/services/order.service.ts \
  services/order-engine/src/presentation/controllers/order.controller.ts \
  services/order-engine/src/presentation/dto/modify-order.dto.ts \
  services/portfolio/src/domain/services/balance.service.ts \
  services/portfolio/src/presentation/controllers/portfolio.controller.ts \
  scripts/phase2-build-and-commit.sh

git commit -m "Phase 2: 실시간 스트리밍, 주문 고도화, P&L 분석, 자산 확장

- WebSocket 실시간 가격 스트리밍 (Redis PubSub -> API Gateway -> 클라이언트)
  - PriceSubscriberService: Redis 20개 채널 구독
  - PriceGateway: Socket.IO 룸 기반 브로드캐스트
- 리밋 주문 크로싱 매칭 (가격-시간 우선순위)
  - matchLimitOrder: 리밋 주문이 반대 호가를 넘을 때 즉시 체결
  - modifyOrder: 주문 수정 (가격/수량) + 이벤트 소싱 ORDER_MODIFIED
  - PATCH /orders/:orderId API 엔드포인트
- P&L 계산 및 포트폴리오 분석
  - getPortfolioValuation: 실시간 시가 기반 미실현 손익 계산
  - getLeaderboard: 포트폴리오 가치 기준 리더보드
  - GET /portfolio/valuation, /portfolio/leaderboard 엔드포인트
- Market Data 고도화
  - 20개 자산 지원 (크립토 10 + 주식 10)
  - 변동성 이벤트 (0.2% 확률로 2-4배 변동성 30초간 적용)
  - 개선된 거래량 시뮬레이션 (가격/변동성 비례)"

echo "  OK 커밋 완료"

# ── 5. Push ──
echo ""
echo "[5/5] Push..."
git push origin dev

# stg, prod 머지
echo ""
echo "  dev -> stg 머지..."
git checkout stg
git merge dev --no-edit
git push origin stg

echo "  stg -> prod 머지..."
git checkout prod
git merge stg --no-edit
git push origin prod

# dev로 복귀
git checkout dev

echo ""
echo "============================================"
echo "  Phase 2 완료!"
echo "============================================"
echo ""
echo "변경 요약:"
echo "  - WebSocket 실시간 가격 스트리밍"
echo "  - 리밋 주문 크로싱 매칭 + 주문 수정"
echo "  - P&L 계산 및 리더보드"
echo "  - 20개 자산 지원 + 변동성 이벤트"
echo ""
