# VirtuEx 시스템 감사 보고서 (12차)

**VirtuEx System Audit Report (12th)**

- 감사일: 2026-03-13
- 감사 범위: UX 모션/전환 개선 + 시스템 설정 비즈니스 로직 통합 + 모바일 UX 개선 + 기능 버그 수정
- 감사 방법: 전체 소스 코드 정적 분석 + 빌드 검증 + 서비스 기동 테스트
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)

---

## 요약 (Executive Summary)

| 심각도 | 건수 | 주요 범주 |
|--------|------|-----------|
| **Critical** | 2 | React Hooks 위반, 데이터 표시 오류 (수정 완료) |
| **High** | 3 | 시스템 설정 미적용: 수수료·일일 손실·주문 검증 (수정 완료) |
| **Medium** | 9 | UX 모션 일관성, 모바일 터치 타겟, 접근성 |
| **Low** | 7 | 전환 미세 조정, 코드 품질 |
| **합계** | **21** | |

이번 12차 감사는 네 가지 핵심 영역에 집중했습니다:
1. **UX 모션/전환 부드러움 개선** — 프로젝트 전체의 애니메이션 타이밍과 전환 효과를 감사하고 개선
2. **시스템 설정 비즈니스 로직 통합** — 관리자 설정이 실제 주문/인증 로직에 적용되도록 통합 (수수료, 일일 손실 한도 포함)
3. **모바일 UX 개선** — 터치 타겟, 드롭다운 전환, 스무스 애니메이션
4. **기능 버그 수정** — React Hooks 위반, [object Object] 표시 오류, 자기 팔로우 방지

---

## 1. 기능 버그 수정 — 4건 (모두 수정 완료)

### [C-01] ToastContainer React Hooks 순서 위반 (Critical) ✅
- **파일**: `ToastContainer.tsx`
- **설명**: `useToastStore((s) => s.removeToast)` 호출이 early return (`if (toasts.length === 0) return null`) 뒤에 위치하여 React Rules of Hooks 위반. 팔로우 클릭 시 토스트가 트리거되면 앱 전체에서 오류 발생
- **영향**: 커뮤니티/리더보드 팔로우 클릭 시 전체 앱 크래시
- **수정**: `removeToast` Hook을 early return 이전으로 이동

### [C-02] 트레이더 팔로워 수 [object Object] 표시 (Critical) ✅
- **파일**: `useFollow.ts` (`useBatchFollowCounts`)
- **설명**: 서버가 `Record<string, { followingCount, followerCount }>` 형태로 응답하지만, 프론트엔드가 `Record<string, number>`를 기대하여 `[object Object]`로 렌더링
- **수정**: 응답 파싱 로직에 타입 검사 추가, `followerCount` 필드만 추출

### [H-02] 자기 자신 팔로우 가능 (High) ✅
- **파일**: `community/page.tsx`, `leaderboard/page.tsx`
- **설명**: 로그인한 사용자가 자신의 프로필에서 팔로우 버튼을 클릭할 수 있음
- **수정**: `currentUser.id === userId` 비교 후 early return 추가

### [L-06] MarketIndexSummary 미사용 변수 린트 에러 (Low) ✅
- **파일**: `MarketIndexSummary.tsx:116`
- **설명**: `const [hovered, setHovered]`에서 `hovered`가 미사용으로 빌드 실패
- **수정**: `_hovered`로 리네임

---

## 2. 시스템 설정 비즈니스 로직 통합 — 5건 (모두 수정 완료)

### [H-01] order-engine에서 시스템 설정 미적용 (High) ✅
- **파일**: `order-engine/src/application/services/order.service.ts`
- **설명**: 관리자가 설정한 거래 제한, 시장 시간, 리스크 관리, 시스템 상태(유지보수 모드, 거래 중지)가 주문 처리에 전혀 반영되지 않음
- **수정**:
  - `SystemSettingsClient` 생성 (30초 TTL 캐시, 장애 시 기본값 폴백)
  - `validateSystemSettings()` 메서드: 유지보수 모드, 거래 활성화, 시장 시간, 주말 거래, 최소/최대 주문 수량, 미체결 주문 한도, 단일 주문 최대 금액

### [H-03] 거래 수수료(maker/taker) 미적용 (High) ✅
- **파일**: `order-engine/src/application/services/order.service.ts` (`settleTrade`)
- **설명**: `tradingFees.makerFee`/`tradingFees.takerFee` 설정이 정의만 되어 있고 실제 거래 정산에 반영되지 않음
- **수정**:
  - `settleTrade()`에서 수수료율 적용: 매수자는 테이커 수수료(가격 상승), 매도자는 메이커 수수료(가격 하락)
  - `placeOrder()`의 자금 예약 시 수수료 버퍼 포함 (충분한 예약금 확보)
  - 정산 가격에 수수료를 반영하여 기존 포트폴리오 API 변경 없이 적용

### [H-04] 일일 손실 한도(dailyLossLimitPercent) 미적용 (High) ✅
- **파일**: `order-engine/src/application/services/order.service.ts`
- **설명**: `riskManagement.dailyLossLimitPercent` 설정이 정의만 되어 있고, 일일 손실이 한도를 초과해도 추가 주문이 가능
- **수정**:
  - `getDailyRealizedLoss()`: 당일 매도 거래의 실현 손실을 계산
  - `getPortfolioValue()`: 포트폴리오 총 가치 조회
  - `validateSystemSettings()`에서 일일 손실율 = 당일 실현 손실 / 포트폴리오 총 가치 검증

### [L-04] user-auth 세션 보안 설정 하드코딩 (Low) ✅
- **파일**: `user-auth/src/application/services/auth.service.ts`
- **설명**: 세션 TTL과 최대 인증 시도 횟수가 관리자 설정 패널 값을 무시
- **수정**: `getSessionSecuritySettings()` 메서드 추가 (30초 캐시), 로그인/비밀번호 재설정 시 동적 적용

### [L-05] .env에 USER_AUTH_URL 누락 (Low) ✅
- **파일**: `.env`
- **설명**: order-engine이 user-auth 서비스에 설정을 조회하려면 `USER_AUTH_URL`이 필요하나 미정의
- **수정**: `USER_AUTH_URL=http://localhost:3007` 추가

---

## 3. UX 모션 개선 — 7건 (모두 수정 완료)

### [M-01] 모달 애니메이션 너무 빠름 (Medium) ✅
- **파일**: `globals.css`
- **수정**: 백드롭 0.2s→0.25s, 콘텐츠 0.25s→0.3s

### [M-02] 드롭다운 애니메이션 너무 빠름 (Medium) ✅
- **파일**: `globals.css`
- **수정**: 0.15s→0.25s, cubic-bezier(0.16, 1, 0.3, 1) 스프링 곡선, translateY(-4px) 추가

### [M-03] BottomSheet 애니메이션 불일치 (Medium) ✅
- **파일**: `BottomSheet.tsx`
- **수정**: 0.3s 스프링 곡선, `animate-modal-backdrop` 추가

### [M-04] 채팅 패널 애니메이션 불일치 (Medium) ✅
- **파일**: `globals.css`
- **수정**: 0.25s cubic-bezier(0.16, 1, 0.3, 1)

### [M-05] 헤더 사이드 메뉴 애니메이션 (Medium) ✅
- **파일**: `Header.tsx`
- **수정**: 0.25s 스프링 곡선, 배경 `animate-modal-backdrop` 추가

### [L-01] FLIP 애니메이션 타이밍 불일치 (Low) ✅
- **파일**: `leaderboard/page.tsx`
- **수정**: 0.5s → 0.4s로 통일

### [L-02] AssetList 셰브론 회전 전환 누락 (Low) ✅
- **파일**: `AssetList.tsx`
- **수정**: `duration-200` 추가

---

## 4. 모바일 UX 개선 — 7건 (모두 수정 완료)

### [M-06] 도움말 탭 모바일 좌우스크롤 → 드롭다운 전환 (Medium) ✅
- **파일**: `help/page.tsx`
- **설명**: 모바일에서 도움말 카테고리 탭이 좌우 스크롤로 탐색해야 해 불편
- **수정**: 모바일에서 드롭다운 메뉴로 전환, `max-height/opacity` CSS 트랜지션으로 부드러운 펼침/접기

### [M-10] 도움말 드롭다운에서 일부 탭 잘림 (Medium) ✅
- **파일**: `help/page.tsx`
- **설명**: 모바일 드롭다운 `max-h-[600px]`이 16개 탭(일반 11 + 관리자 5)을 담기에 부족하여 서비스 상태 등 하단 탭이 보이지 않음
- **수정**: `max-h-[80vh]`로 변경하고, 드롭다운 내부에 `max-h-[60vh] overflow-y-auto` 추가하여 스크롤 가능하도록 개선

### [M-07] AssetList 모바일 필터 패널 전환 애니메이션 누락 (Medium) ✅
- **파일**: `AssetList.tsx`
- **설명**: 모바일 필터 패널이 조건부 렌더링으로 갑자기 나타남
- **수정**: CSS `max-h-[300px] opacity-100` / `max-h-0 opacity-0` 트랜지션 적용

### [M-08] 주문 페이지 수정/취소 버튼 터치 타겟 부족 (Medium) ✅
- **파일**: `orders/page.tsx:608-620`
- **설명**: 수정/취소 버튼이 `py-1 text-[10px]` (약 24px) — 모바일 권장 최소 36px 미달
- **수정**: 모바일에서 `min-h-[36px] py-1.5 text-[11px]`로 확대

### [L-03] BottomNav 스케일 애니메이션 갑작스러움 (Low) ✅
- **파일**: `BottomNav.tsx`
- **설명**: `active:scale-95`는 있으나 `transition-colors`만 적용되어 스케일 변화가 즉각적
- **수정**: `transition-all duration-100`으로 변경하여 부드러운 탭 피드백

### [L-07] Tooltip 조건부 렌더링 깜빡임 (Low) ✅
- **파일**: `Tooltip.tsx`
- **설명**: `{visible && <span>}` 조건부 렌더링으로 툴팁이 갑자기 나타나고 사라짐
- **수정**: 항상 렌더하되 `opacity-0/opacity-100 transition-opacity duration-200`으로 부드러운 페이드

### [L-08] 주문 페이지 상태 드롭다운 애니메이션 누락 (Low) ✅
- **파일**: `orders/page.tsx`
- **설명**: StatusDropdown에 열림 애니메이션 없음
- **수정**: `animate-dropdown-in` 클래스 추가

---

## 5. 접근성 개선 — 2건 (모두 수정 완료)

### [M-09] 토스트 알림 표시 시간 부족 (Medium) ✅
- **파일**: `globals.css`
- **수정**: 3초 → 4초 연장, 키프레임 비율 조정

### [L-09] prefers-reduced-motion 누락 애니메이션 (Low) ✅
- **파일**: `globals.css`
- **수정**: `.animate-toast-fade`, `.animate-live-toast-in`, `.animate-chat-panel-in`, `.animate-dropdown-in` 추가

---

## 6. 감사 보고서 인프라 — 2건 (모두 수정 완료)

### [L-10] 감사 보고서 매니페스트 생성기 MD 미지원 (Low) ✅
- **파일**: `generate-audit-manifest.mjs`
- **설명**: 스크립트가 PDF만 스캔하여 MD 전용 보고서가 매니페스트에서 누락
- **수정**: `MD_ONLY_PATTERN` 추가, PDF 없는 MD 보고서도 매니페스트에 포함

### [L-11] MD 감사 보고서 뷰어 미구현 (Low) ✅
- **파일**: `admin/audit/page.tsx`
- **설명**: MD 파일을 PDF처럼 `window.open()`으로 열면 원문 마크다운이 보임
- **수정**: MD 파일은 `ContentModal`로 렌더링하여 마크다운 형식으로 표시

---

## 검증 결과

| 항목 | 결과 |
|------|------|
| 프론트엔드 빌드 | ✅ 성공 |
| 백엔드 빌드 (10개 서비스) | ✅ 성공 |
| 서비스 기동 | ✅ 전체 정상 |
| ESLint | ✅ 오류 없음 |
| 타입 검사 | ✅ 오류 없음 |

---

## 수정 파일 목록

### 프론트엔드 (13개 파일)
| 파일 | 변경 내용 |
|------|-----------|
| `globals.css` | 모달/드롭다운/채팅/토스트 애니메이션 개선, reduced-motion 확장 |
| `ToastContainer.tsx` | Hooks 순서 위반 수정 (removeToast를 early return 이전으로 이동) |
| `useFollow.ts` | 팔로워 수 응답 파싱 수정 (nested object → number 추출) |
| `community/page.tsx` | 자기 팔로우 방지 추가 |
| `leaderboard/page.tsx` | 자기 팔로우 방지 추가, FLIP 0.4s 통일 |
| `help/page.tsx` | 모바일 탭 → 드롭다운 전환 (CSS 트랜지션) |
| `AssetList.tsx` | 모바일 필터 CSS 트랜지션, 셰브론 duration 추가 |
| `BottomSheet.tsx` | 0.3s 스프링 곡선, 배경 페이드 |
| `Header.tsx` | 사이드 메뉴 0.25s 스프링, 배경 페이드 |
| `BottomNav.tsx` | transition-all duration-100 (스케일 부드러움) |
| `Tooltip.tsx` | 조건부 렌더링 → CSS opacity 트랜지션 |
| `orders/page.tsx` | 터치 타겟 확대, 드롭다운 애니메이션 추가 |
| `admin/audit/page.tsx` | MD 보고서 ContentModal 렌더링 |
| `generate-audit-manifest.mjs` | MD 전용 보고서 스캔 지원 |
| `MarketIndexSummary.tsx` | 미사용 변수 린트 수정 |

### 백엔드 (4개 파일)
| 파일 | 변경 내용 |
|------|-----------|
| `order-engine/infrastructure/settings/system-settings.client.ts` | 신규 — 설정 조회 클라이언트 (30초 TTL 캐시) |
| `order-engine/app.module.ts` | SystemSettingsClient 등록 |
| `order-engine/application/services/order.service.ts` | 시스템 설정 검증 + 거래 수수료 적용 + 일일 손실 한도 + 자금 예약 수수료 버퍼 |
| `user-auth/application/services/auth.service.ts` | 동적 세션 보안 설정 적용 |

### 인프라 (1개 파일)
| 파일 | 변경 내용 |
|------|-----------|
| `.env` | `USER_AUTH_URL` 추가 |
