# VirtuEx 사용자 UX 개선 감사 보고서 (2차)

**VirtuEx User Experience Improvement Audit Report (2nd)**

- 감사일: 2026-03-16
- 감사 범위: 모바일 반응형, 키보드 접근성, 폼 UX, 네비게이션/브레드크럼, 빈 상태, 토스트 일관성, 색상 대비, 검색/필터 UX
- 감사 방법: 컴포넌트별 반응형 클래스 분석, ARIA 속성 검사, UX 패턴 일관성 검토, WCAG 2.1 가이드라인 대조
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 발견 사항만 기록하며, 수정은 포함하지 않음

---

## 이전 감사 대비 수정 현황 (1차 → 2차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [MOD-M-01] AI 분석 모달 포커스 트랩 미적용 | **수정됨** | useFocusTrap 적용 + useScrollLock 적용 |
| [MOD-L-01] AI 분석 모달 Escape 키 미지원 | **수정됨** | useEffect onKeyDown Escape 핸들러 추가 |
| [EMP-L-01] 포트폴리오 분석 탭 빈 상태 안내 | **수정됨** | 빈 상태 UI + 대시보드 이동 CTA 추가 |
| [A11Y-M-01] ARIA 속성 적용률 낮음 | 미수정 | 추후 개선 예정 |
| [A11Y-M-02] 이미지 alt/lazy loading | 미수정 | DOMPurify 보안 트레이드오프 |
| [FRM-M-01] 비밀번호 표시/숨기기 미구현 | 미수정 | 추후 개선 예정 |
| [RD-M-01] OrderForm 반응형 전무 | 미수정 | 추후 개선 예정 |
| [RD-M-02] 대시보드 단일 대형 컴포넌트 | 미수정 | TODO 주석 추가됨 |
| [UX-M-01] 백엔드 에러 한국어 하드코딩 | 미수정 | 에러 코드 체계 도입 필요 |

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 모바일 반응형 | 0 | 0 | 3 | 1 | 4 |
| B. 키보드/접근성 | 0 | 0 | 2 | 1 | 3 |
| C. 폼/입력 UX | 0 | 0 | 2 | 1 | 3 |
| D. 네비게이션/흐름 | 0 | 0 | 1 | 1 | 2 |
| E. 빈 상태/안내 | 0 | 0 | 1 | 1 | 2 |
| F. 토스트/피드백 일관성 | 0 | 0 | 1 | 1 | 2 |
| G. 색상/대비/가독성 | 0 | 0 | 1 | 0 | 1 |
| H. 검색/필터 UX | 0 | 0 | 1 | 1 | 2 |
| **합계** | **0** | **0** | **12** | **7** | **19** |

---

## A. 모바일 반응형 — 4건

### [RD-M-01] OrderForm — 반응형 클래스 전무 (Medium, 미수정)

**현상:** OrderForm 컴포넌트에 `sm:`, `md:`, `lg:` 등 반응형 브레이크포인트 클래스가 전혀 없음. 모바일 기기에서 폼이 화면 크기에 맞게 조정되지 않아 입력 필드와 버튼이 좁게 표시
**위치:** `frontend/src/components/trading/OrderForm.tsx`
**권장:** 모바일 기기용 패딩, 폰트 크기, 레이아웃 방향 반응형 클래스 추가
**심각도:** Medium

### [RD-M-03] 리더보드 — 팔로우/카피 버튼 모바일 미표시 (Medium)

**현상:** 리더보드 테이블에서 팔로우/카피트레이딩 버튼이 `hidden sm:flex`로 데스크탑에서만 표시됨. 모바일 사용자는 리더보드에서 직접 팔로우/카피트레이딩을 실행할 수 없음
**위치:** `frontend/src/app/(main)/leaderboard/page.tsx:532`
**영향:** 모바일 사용자의 핵심 소셜 기능 접근 차단
**권장:** 모바일에서 행 클릭/탭 시 액션 바텀시트 표시, 또는 인라인 축약 버튼 추가
**심각도:** Medium

### [RD-M-04] 주문 내역 분석 탭 — 시간대별 차트 모바일 가독성 저하 (Medium)

**현상:** 24시간 시간대별 바 차트에서 `gap-[3px]`으로 24개 바를 좁은 화면에 배치. 모바일 320px 기준으로 각 바 너비가 약 10px 미만이 되어 터치 타겟 불충분(WCAG 44px 최소 권장). 시간 라벨도 `text-[9px]`으로 가독 어려움
**위치:** `frontend/src/app/(main)/orders/page.tsx:260-300`
**권장:** 모바일에서 12시간씩 2행 또는 가로 스크롤로 분할, 바 너비 최소 24px 보장
**심각도:** Medium

### [RD-L-01] AssetDetailPage — 고정 매수/매도 바 bottom 오프셋 하드코딩 (Low)

**현상:** 하단 고정 매수/매도 바가 `bottom-[56px]`으로 BottomNav 높이를 하드코딩. BottomNav가 없는 데스크탑에서도 동일 오프셋이 적용되어 불필요한 여백. `lg:bottom-0`으로 분기하고 있으나 `bottom-[56px]`이 더 구체적이어서 우선됨
**위치:** `frontend/src/app/(main)/asset/[symbol]/page.tsx:486`
**권장:** Tailwind의 `bottom-0 lg:bottom-0` 대신 CSS 변수 또는 미디어 쿼리로 BottomNav 높이를 동적 적용
**심각도:** Low

---

## B. 키보드/접근성 — 3건

### [A11Y-M-03] 커뮤니티 게시글 카드 — div onClick 키보드 접근 불가 (Medium)

**현상:** 게시글 목록의 카드가 `<div onClick={...}>` 패턴으로 구현. `role="button"`, `tabIndex`, `onKeyDown(Enter/Space)` 없음. 키보드 사용자가 Tab으로 게시글 카드에 포커스하거나 Enter로 진입할 수 없음
**위치:** `frontend/src/app/(main)/community/page.tsx:634`
**영향:** 키보드/스크린리더 사용자의 커뮤니티 탐색 불가
**권장:** `role="link"` + `tabIndex={0}` + `onKeyDown` 핸들러 추가, 또는 `<Link>` 컴포넌트로 교체
**심각도:** Medium

### [A11Y-M-04] 전략 카드 / 트레이더 카드 — 동일한 div onClick 패턴 (Medium)

**현상:** `StrategyCard`와 `TraderCard` 모두 `<div onClick={...} className="cursor-pointer">` 패턴. 접근성 속성 미포함
**위치:** `frontend/src/app/(main)/community/page.tsx:68-137, 164-253`
**권장:** 클릭 가능한 카드에 `role="button"` 또는 시맨틱 `<button>`/`<a>` 사용
**심각도:** Medium

### [A11Y-L-02] 언팔로우 확인 모달 — ConfirmModal 미사용으로 접근성 불일치 (Low)

**현상:** 커뮤니티와 리더보드의 언팔로우 확인 모달이 `ConfirmModal` 컴포넌트 대신 인라인 JSX로 구현. `role="dialog"`, `aria-modal`, 포커스 트랩, Escape 키 핸들러 미적용. 다른 모달은 `ConfirmModal`로 일관되게 구현되어 있어 불일치
**위치:** `frontend/src/app/(main)/community/page.tsx:926-951`, `frontend/src/app/(main)/leaderboard/page.tsx:587-613`
**권장:** 기존 `ConfirmModal` 컴포넌트를 재사용하여 접근성 일관성 확보
**심각도:** Low

---

## C. 폼/입력 UX — 3건

### [FRM-M-01] 로그인 — 비밀번호 표시/숨기기 토글 없음 (Medium, 미수정)

**현상:** 비밀번호 입력 필드가 `type="password"` 고정. 사용자가 입력 내용을 확인할 수 없어 오타로 인한 로그인 실패 빈도 증가
**위치:** `frontend/src/app/(auth)/login/page.tsx`
**심각도:** Medium

### [FRM-M-03] 주문 수정 — 인라인 폼 검증 피드백 부재 (Medium)

**현상:** 대기 중인 주문의 인라인 수정 모드(`editingOrderId`)에서 가격/수량 입력 시 실시간 검증 피드백 없음. 빈 값이나 0 입력 시 버튼만 비활성되지 않고, `handleModify`에서 `if (!price && !quantity) return`으로 사일런트 무시. 사용자에게 왜 수정이 안 되는지 안내 부재
**위치:** `frontend/src/app/(main)/orders/page.tsx:394-405, 544-582`
**권장:** 입력 필드에 `min` 속성 + 빈 값 시 에러 메시지 표시
**심각도:** Medium

### [FRM-L-02] 입금/출금 — 키보드 Enter 제출 미지원 (Low)

**현상:** 입금/출금 BottomSheet에서 금액 입력 후 Enter 키로 제출할 수 없음. 모바일 키보드의 "완료" 버튼이 폼 제출을 트리거하지 않아 반드시 "입금"/"출금" 버튼을 터치해야 함
**위치:** `frontend/src/app/(main)/portfolio/page.tsx:369-419, 422-491`
**권장:** `<form onSubmit>` 래핑 또는 Input에 `onKeyDown(Enter)` 핸들러 추가
**심각도:** Low

---

## D. 네비게이션/흐름 — 2건

### [NAV-M-01] 커뮤니티 게시글 상세 — 뒤로가기 항상 목록으로 이동 (Medium)

**현상:** 게시글 상세 페이지의 뒤로가기 버튼이 `<Link href="/community">`로 고정. 전략 탭이나 검색 결과에서 게시글에 진입한 경우에도 커뮤니티 메인(discussions 탭)으로 이동하여 이전 컨텍스트(탭, 검색어, 페이지 번호)가 사라짐
**위치:** `frontend/src/app/(main)/community/[id]/page.tsx:318`
**권장:** `router.back()` 사용 또는 이전 탭/검색 상태를 URL 파라미터로 보존
**심각도:** Medium

### [NAV-L-01] 종목 상세 — 뒤로가기가 항상 대시보드로 이동 (Low)

**현상:** 종목 상세 페이지의 뒤로가기가 `<Link href="/dashboard">`로 고정. 포트폴리오 보유 종목 클릭이나 스포트라이트 검색에서 진입한 경우에도 대시보드로 이동
**위치:** `frontend/src/app/(main)/asset/[symbol]/page.tsx:164`
**권장:** `router.back()` 또는 referrer 기반 동적 뒤로가기
**심각도:** Low

---

## E. 빈 상태/안내 — 2건

### [EMP-M-01] 체결 내역 분석 탭 — 승률 0% 시 안내 부재 (Medium)

**현상:** 분석 탭에서 매수만 하고 매도하지 않은 사용자의 승률이 0/0 = 0%로 표시. "매수/매도를 모두 한 종목에서만 승패가 판정됩니다" 등의 설명이 없어 사용자 혼란 가능
**위치:** `frontend/src/app/(main)/orders/page.tsx:132-176`
**권장:** wins + losses === 0일 때 승률 대신 "아직 매도 완료한 종목이 없습니다" 안내 표시
**심각도:** Medium

### [EMP-L-02] 가격 알림 모달 — 알림 없을 때 빈 상태 미확인 (Low)

**현상:** 종목 상세 페이지의 가격 알림 모달에서 활성 알림이 0개일 때의 빈 상태 안내가 모달 내부에서 제공되는지 미확인. 모달이 비어 보일 수 있음
**위치:** `frontend/src/components/alerts/PriceAlertModal.tsx`
**권장:** "설정된 가격 알림이 없습니다. 가격 조건을 추가해보세요" 안내 표시
**심각도:** Low

---

## F. 토스트/피드백 일관성 — 2건

### [TST-M-01] 관심종목 토글 — 피드백 없음 (Medium)

**현상:** 관심종목 추가/제거 시 토스트 알림이 없음. 별 아이콘 색상만 변경되어 사용자가 동작 완료를 인지하기 어려움. 특히 네트워크 지연 시 토글 상태가 불명확
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:138-148`, `frontend/src/hooks/useWatchlist.ts`
**권장:** `addWatchlist.onSuccess` / `removeWatchlist.onSuccess`에 토스트 추가 ("관심종목에 추가되었습니다" / "관심종목에서 제거되었습니다")
**심각도:** Medium

### [TST-L-01] 주문 성공 — 주문 유형/방향 명시 부재 (Low)

**현상:** 주문 성공 시 `onSuccess` 콜백에서 특별한 토스트 없이 캐시 무효화만 수행. QueryProvider의 전역 MutationCache에서 성공 토스트가 표시되는지 여부에 따라 다르지만, 주문 유형(시장가/지정가)이나 방향(매수/매도) 정보가 토스트에 포함되지 않음
**위치:** `frontend/src/hooks/useOrders.ts:117-123`
**권장:** 성공 토스트에 "BTCUSDT 0.5개 시장가 매수 완료" 형태의 구체적 정보 포함
**심각도:** Low

---

## G. 색상/대비/가독성 — 1건

### [CON-M-01] text-text-quaternary — 배경 대비 낮은 대비율 (Medium)

**현상:** `text-text-quaternary` 클래스가 광범위하게 사용됨 (날짜, 부가 정보, 필터 비활성 상태 등). `#17171C` 배경 대비 이 색상의 대비율이 WCAG AA 기준(4.5:1)에 미달할 가능성. 특히 `text-[10px]`~`text-[11px]` 소형 텍스트에서 가독성 저하
**위치:** 프론트엔드 전반 — 대시보드, 주문 내역, 커뮤니티, 리더보드 등
**권장:** text-text-quaternary 값을 WCAG AA 4.5:1 이상으로 밝기 조정, 또는 소형 텍스트에는 text-text-tertiary 사용
**심각도:** Medium

---

## H. 검색/필터 UX — 2건

### [SRC-M-01] 커뮤니티 검색 — 검색 결과 수 미표시 (Medium)

**현상:** 커뮤니티 게시글 검색 시 검색 결과 개수가 표시되지 않음. 사용자가 "10건 중 3건 일치" 또는 "검색 결과 없음"을 구분하기 어려움. 페이지네이션의 `total` 값이 있으나 검색어와 함께 표시되지 않음
**위치:** `frontend/src/app/(main)/community/page.tsx:614-693`
**권장:** 검색 활성 시 "'{query}' 검색 결과 {total}건" 배너 표시
**심각도:** Medium

### [SRC-L-01] 주문 내역 검색 — 디바운스 미적용 (Low)

**현상:** 주문 탭의 심볼 검색은 300ms 디바운스가 적용되어 있으나, 체결 내역 탭의 `tradeSearch`는 `onChange`에서 직접 `setTradeSearch`를 호출하여 디바운스 없이 매 키 입력마다 `filteredTrades` useMemo가 재계산됨
**위치:** `frontend/src/app/(main)/orders/page.tsx:683`
**영향:** 대량 체결 내역에서 타이핑 시 미세한 렉 발생 가능
**권장:** 주문 탭과 동일한 디바운스 패턴 적용
**심각도:** Low

---

## 종합 의견

2차 UX 개선 감사에서는 총 19건의 이슈가 발견되었습니다. 1차 감사에서 발견된 AI 모달 포커스 트랩(MOD-M-01), Escape 키(MOD-L-01), 포트폴리오 분석 빈 상태(EMP-L-01) 3건이 정상 수정된 것을 확인하였습니다.

1차에서 미수정된 OrderForm 반응형(RD-M-01), 비밀번호 표시 토글(FRM-M-01), 백엔드 에러 한국어 하드코딩(UX-M-01) 등은 여전히 개선이 필요합니다.

새로 발견된 이슈 중 리더보드 모바일 팔로우 버튼 미표시(RD-M-03)는 모바일 사용자의 핵심 소셜 기능 접근을 차단하는 문제입니다. 커뮤니티 카드의 키보드 접근성 부재(A11Y-M-03/04)는 div onClick 패턴의 체계적 개선이 필요합니다.

관심종목 토글 피드백 부재(TST-M-01)와 text-text-quaternary 대비율(CON-M-01)은 비교적 적은 노력으로 높은 UX 개선 효과를 기대할 수 있는 항목입니다. 언팔로우 확인 모달의 ConfirmModal 미사용(A11Y-L-02)은 기존 컴포넌트 재사용만으로 접근성 일관성을 확보할 수 있습니다.

---

*본 보고서는 자동 생성된 감사 결과이며, 수정 사항은 포함되지 않습니다.*
