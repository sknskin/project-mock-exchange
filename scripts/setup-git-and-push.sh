#!/bin/bash
set -e

PROJECT_DIR="/Users/dohee/Documents/workspace/project/mock-exchange"
cd "$PROJECT_DIR"

echo "============================================"
echo "  Mock Exchange - Git 설정 및 Push 스크립트"
echo "============================================"

# ── 0. 사전 정리 ──
echo ""
echo "[0/8] 사전 정리..."
rm -rf .git
rm -rf node_modules
rm -rf services/*/node_modules
rm -rf packages/*/node_modules
rm -rf services/*/dist
rm -rf packages/*/dist
rm -rf services/*/src/generated
echo "  ✓ 이전 .git, node_modules, dist, generated 제거 완료"

# ── 1. PDF 기획서 생성 ──
echo ""
echo "[1/8] PDF 기획서 생성..."
if command -v python3 &> /dev/null; then
    pip3 install reportlab matplotlib --quiet 2>/dev/null || true
    python3 docs/generate_spec_pdf.py && echo "  ✓ PDF 생성 완료" || echo "  ⚠ PDF 생성 실패 (계속 진행)"
else
    echo "  ⚠ python3 없음 - PDF 생성 건너뜀"
fi

# ── 2. Git 초기화 ──
echo ""
echo "[2/8] Git 초기화..."
git init
git checkout -b dev
echo "  ✓ git init + dev 브랜치 생성"

# ── 3. 커밋 1: 프로젝트 기반 구조 (Phase 0-1) ──
echo ""
echo "[3/8] 커밋 1: 프로젝트 기반 구조..."
git add \
  package.json \
  pnpm-workspace.yaml \
  pnpm-lock.yaml \
  turbo.json \
  tsconfig.base.json \
  eslint.config.mjs \
  .prettierrc \
  .gitignore \
  .env.example \
  .husky/ \
  README.md \
  ARCHITECTURE.md \
  ARCHITECTURE_SUMMARY_KR.md \
  docker-compose.yml

git commit -m "초기 프로젝트 구조 설정

- Turborepo + pnpm 모노레포 구성
- Docker Compose (PostgreSQL, Redis, Kafka) 설정
- ESLint, Prettier, Husky 린팅 환경
- 시스템 아키텍처 설계 문서 작성
- README.md 프로젝트 설명서 작성"
echo "  ✓ 커밋 1 완료"

# ── 4. 커밋 2: 공유 패키지 ──
echo ""
echo "[4/8] 커밋 2: 공유 패키지..."
git add packages/

git commit -m "공유 패키지 구현 (common, event-store)

- @mock-exchange/common: 상수, DTO, 이벤트 타입, 유틸리티
- @mock-exchange/event-store: PostgreSQL 이벤트 스토어, AggregateRoot 베이스 클래스
- CloudEvent 스펙 기반 이벤트 스키마
- Kafka 토픽 상수 및 DLQ 토픽 정의"
echo "  ✓ 커밋 2 완료"

# ── 5. 커밋 3: 인프라 및 스크립트 ──
echo ""
echo "[5/8] 커밋 3: 인프라 및 CI/CD..."
git add \
  infrastructure/ \
  scripts/ \
  .github/ \
  tests/ \
  apps/

git commit -m "인프라 설정 및 CI/CD 파이프라인

- PostgreSQL 초기화 SQL (6개 데이터베이스 생성)
- Kafka 토픽 생성 스크립트 (12개 토픽 + 4개 DLQ)
- Prometheus 모니터링 설정
- GitHub Actions CI 파이프라인 (lint, typecheck, test, build)
- 개발 환경 설정 스크립트 (dev-setup.sh, migrate-all.sh)"
echo "  ✓ 커밋 3 완료"

# ── 6. 커밋 4: User/Auth + API Gateway ──
echo ""
echo "[6/8] 커밋 4: 인증 서비스 및 API Gateway..."
git add \
  services/user-auth/ \
  services/api-gateway/

git commit -m "User/Auth 서비스 및 API Gateway 구현

- User/Auth: 회원가입, 로그인, JWT 액세스 토큰 + 리프레시 토큰 회전
- bcrypt 비밀번호 해싱, httpOnly 쿠키 기반 리프레시 토큰
- Prisma ORM (users, refresh_tokens 테이블)
- API Gateway: JWT 검증, Rate Limiting (100req/min), HTTP 프록시
- WebSocket Gateway (Socket.IO) 가격 스트리밍 스켈레톤
- Market, Order, Portfolio 프록시 컨트롤러"
echo "  ✓ 커밋 4 완료"

# ── 7. 커밋 5: Phase 1 핵심 트레이딩 서비스 ──
echo ""
echo "[7/8] 커밋 5: 핵심 트레이딩 서비스 (Phase 1)..."
git add \
  services/market-data/ \
  services/order-engine/ \
  services/portfolio/

git commit -m "핵심 트레이딩 서비스 구현 (Phase 1 MVP)

- Market Data: GBM(기하 브라운 운동) 가격 시뮬레이션 엔진
  - 10개 자산 지원 (BTC, ETH, SOL, XRP, DOGE, AAPL, GOOGL, TSLA, MSFT, NVDA)
  - Redis 가격 캐시 + Kafka 이벤트 발행 + 캔들스틱 집계
- Order Engine: 이벤트 소싱 + CQRS 기반 주문 처리
  - OrderAggregate (place, match, cancel) 도메인 모델
  - 인메모리 매칭 엔진 (가격-시간 우선순위)
  - 멱등성 체크, CQRS 읽기 모델 프로젝션
- Portfolio: 잔고 관리 및 거래 정산
  - 입금, 자금 예약/해제, 매수/매도 정산
  - 가중평균 원가법 보유자산 관리
  - Decimal.js 정밀 금융 연산"
echo "  ✓ 커밋 5 완료"

# ── 8. 커밋 6: 스켈레톤 서비스 + 기획서 ──
echo ""
echo "[8/8] 커밋 6: 스켈레톤 서비스 및 문서..."
git add \
  services/notification/ \
  services/chat/ \
  services/ai-service/ \
  docs/

git commit -m "스켈레톤 서비스 및 기획서 문서

- Notification, Chat, AI Service 스켈레톤 (헬스체크 포함)
- PDF 기획서 생성 스크립트 (아키텍처 다이어그램 포함)"
echo "  ✓ 커밋 6 완료"

# ── 9. GitHub 레포지토리 생성 및 Push ──
echo ""
echo "============================================"
echo "  GitHub 레포지토리 생성 및 브랜치 설정"
echo "============================================"

# GitHub repo 생성
echo ""
echo "[Push] GitHub private 레포지토리 생성..."
gh repo create mock-exchange --private --source=. --remote=origin \
  --description "Real-Time Mock Trading Platform - Microservices Architecture" \
  2>/dev/null || echo "  ⚠ 레포 이미 존재하거나 gh 인증 필요 - 수동 설정 필요할 수 있음"

# dev 브랜치 push
echo ""
echo "[Push] dev 브랜치 push..."
git push -u origin dev

# stg 브랜치 생성 및 push
echo ""
echo "[Push] stg 브랜치 생성 및 push..."
git checkout -b stg
git push -u origin stg

# prod 브랜치 생성 및 push (메인 브랜치)
echo ""
echo "[Push] prod 브랜치 생성 및 push..."
git checkout -b prod
git push -u origin prod

# prod를 기본 브랜치로 설정
echo ""
echo "[Push] prod를 기본 브랜치로 설정..."
gh repo edit --default-branch prod 2>/dev/null || echo "  ⚠ 기본 브랜치 설정 실패 - GitHub 웹에서 수동 설정 필요"

# dev 브랜치로 돌아가기
git checkout dev

echo ""
echo "============================================"
echo "  완료!"
echo "============================================"
echo ""
echo "브랜치 구조:"
echo "  dev  (개발) ← 현재 위치"
echo "  stg  (스테이징)"
echo "  prod (프로덕션, 기본 브랜치)"
echo ""
echo "작업 흐름: dev → stg → prod (PR 머지)"
echo ""

# ── 10. Cursor로 프로젝트 열기 ──
echo "[마지막] Cursor로 프로젝트 열기..."
if command -v cursor &> /dev/null; then
    cursor "$PROJECT_DIR"
    echo "  ✓ Cursor 실행됨"
elif [ -d "/Applications/Cursor.app" ]; then
    open -a "Cursor" "$PROJECT_DIR"
    echo "  ✓ Cursor 실행됨"
else
    echo "  ⚠ Cursor를 찾을 수 없습니다. 수동으로 열어주세요:"
    echo "    cursor /Users/dohee/Documents/workspace/project/mock-exchange"
fi

echo ""
echo "🎉 모든 작업이 완료되었습니다!"
