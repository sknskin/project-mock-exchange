# VirtuEx 사용자 UX 개선 감사 보고서 (4차)

**VirtuEx User Experience Improvement Audit Report (4th)**

- 감사일: 2026-03-19
- 감사 범위: 모바일 반응형, 키보드 접근성, 폼/입력 UX, 로딩/에러 상태, 네비게이션 흐름, 색상/대비, 검색/필터 UX, 다크/라이트 모드 일관성, 정보 구조
- 감사 방법: 컴포넌트별 반응형 클래스 분석, ARIA 속성 검사, UX 패턴 일관성 검토, WCAG 2.1 가이드라인 대조
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 발견 사항만 기록하며, 수정은 포함하지 않음

---

## 이전 감사 대비 수정 현황 (3차 → 4차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [CLR-M-01] CandlestickChart 다크 모드 전용 색상 | **수정됨** | `isLight` 조건 분기로 라이트/다크 모드별 색상 적용 확인 (`textColor`, `grid`, `crosshair`, `borderColor` 등) |
| [CLR-M-02] PortfolioHistoryChart SVG 라이트 모드 가독성 | **수정됨** | Y축/X축 라벨 및 가이드라인에 `isLight` 조건부 색상 적용 (`#4E5968` vs `#808A98`, `#D8DCE1` vs `#2A2A32`) |
| [LD-M-01] 종목 상세 $0.00 로딩 상태 | **수정됨** | `assetLoading && currentPrice === 0` 조건에서 스켈레톤 표시, 매수/매도 버튼 `disabled` 처리, "Loading..." 텍스트 표시 확인 |
| [NAV-M-01] 커뮤니티 탭 URL 동기화 | **수정됨** | `setTab` 시 `router.replace(url.pathname + url.search, { scroll: false })` 적용, 기본 탭(discussions)이면 파라미터 제거 |
| [A11Y-M-01] ARIA 속성 적용률 낮음 | 부분 수정 | 대시보드 tablist 유지, 기타 탭은 미적용 (하단 참조) |
| [FRM-M-01] 비밀번호 표시/숨기기 미구현 | 미수정 | 마이페이지 비밀번호 변경 모달에서 여전히 미구현 |
| [RD-M-01] OrderForm 반응형 제한적 | 부분 수정 | 비율 수량 버튼 반응형 유지, 전체 레이아웃은 여전히 제한적 |
| [A11Y-M-02] DOMPurify 이미지 alt/lazy loading 보안 트레이드오프 | 미수정 | 보안 트레이드오프 유지 |

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 모바일 반응형 | 0 | 0 | 2 | 2 | 4 |
| B. 키보드/접근성 | 0 | 0 | 2 | 1 | 3 |
| C. 폼/입력 UX | 0 | 0 | 2 | 1 | 3 |
| D. 로딩/에러 상태 | 0 | 0 | 1 | 1 | 2 |
| E. 네비게이션/흐름 | 0 | 0 | 1 | 1 | 2 |
| F. 정보 구조/표시 | 0 | 0 | 1 | 1 | 2 |
| G. 검색/필터 UX | 0 | 0 | 1 | 1 | 2 |
| **합계** | **0** | **0** | **10** | **8** | **18** |

---

## A. 모바일 반응형 — 4건

### [RD-M-01] OrderForm — 반응형 클래스 제한적 (Medium, 부분 수정)

**현상:** `OrderForm.tsx`에 비율 수량 버튼의 `sm:py-1.5 sm:text-[11px]` 반응형이 추가되었으나, 전체적인 레이아웃(가격/수량 입력 필드, 예상 금액 정보, 주문 버튼 등)에 반응형 클래스가 부족. 좁은 화면에서 `space-y-4`만 적용되어 폼 요소가 과도하게 밀집
**위치:** `frontend/src/components/trading/OrderForm.tsx:247-404`
**영향:** 모바일에서 주문 입력 시 터치 타겟이 좁고 시인성 저하
**권장:** Input 컴포넌트에 모바일 전용 높이/패딩 추가, 버튼 높이를 모바일에서 48px 이상으로 확대
**심각도:** Medium

### [RD-M-02] 종목 상세 — 고정 매수/매도 바 safe-bottom 중복 (Medium)

**현상:** `asset/[symbol]/page.tsx:520`의 하단 고정 바에 `safe-bottom px-4 py-3 pb-8 lg:bottom-0 bottom-[56px] mb-2`가 적용. `safe-bottom`과 `pb-8`이 중복되어 iPhone 노치 기기에서 과도한 하단 여백 발생 가능. 또한 `bottom-[56px]`은 모바일 BottomNav 높이를 기대하지만, BottomNav가 없는 레이아웃에서는 불필요한 오프셋
**위치:** `frontend/src/app/(main)/asset/[symbol]/page.tsx:520`
**영향:** 일부 기기에서 매수/매도 버튼이 과도하게 위로 올라가거나, 콘텐츠와 겹칠 수 있음
**권장:** `safe-bottom` 적용 시 `pb-8` 제거하고, BottomNav 존재 여부에 따라 조건부 bottom offset 적용
**심각도:** Medium

### [RD-L-01] 포트폴리오 보유 종목 — 모바일 카드 그리드 단일 열 고정 (Low)

**현상:** `portfolio/page.tsx:233`의 Market Pulse 섹션이 `grid-cols-1 sm:grid-cols-2`로 배치. 모바일에서 보유 종목이 10개+ 시 스크롤이 과도하게 길어짐. 모바일에서도 가로 2열로 축약 표시하면 정보 밀도 향상 가능
**위치:** `frontend/src/app/(main)/portfolio/page.tsx:233`
**영향:** 다수 보유 종목 시 모바일에서 과도한 세로 스크롤
**권장:** 모바일에서 카드 높이를 줄이고 핵심 정보(심볼, 수익률)만 표시하는 컴팩트 레이아웃 적용
**심각도:** Low

### [RD-L-02] 리더보드 — 필터 컨트롤 모바일 가로 오버플로우 (Low)

**현상:** `leaderboard/page.tsx:327-385`의 필터 영역(참여자 수 + 투자자 토글 + 카피트레이딩 토글 + 정렬 탭)이 `flex-wrap`으로 배치되지만, 좁은 화면(360px 미만)에서 정렬 탭 버튼 그룹이 두 번째 줄로 넘어가면서 레이아웃이 깨질 수 있음
**위치:** `frontend/src/app/(main)/leaderboard/page.tsx:327-385`
**영향:** 좁은 화면에서 필터 컨트롤이 겹치거나 잘림
**권장:** 모바일에서 정렬 탭을 드롭다운 또는 별도 행으로 분리
**심각도:** Low

---

## B. 키보드/접근성 — 3건

### [A11Y-M-01] ARIA 속성 — 커뮤니티/주문/포트폴리오/리더보드 탭에 role 미적용 (Medium, 부분 수정)

**현상:** 대시보드 탭 바에는 `role="tablist"` + `aria-selected`가 적용되었으나, 커뮤니티(`community/page.tsx:179-202`), 주문(`orders/page.tsx` 탭 섹션), 포트폴리오(`portfolio/page.tsx:148-166`), 리더보드(`leaderboard/page.tsx:305-323`), 뉴스(`news/page.tsx:222-260`) 등의 탭 UI에는 ARIA 역할이 적용되지 않음
**위치:** `frontend/src/app/(main)/community/page.tsx:179`, `frontend/src/app/(main)/portfolio/page.tsx:148`
**영향:** 스크린 리더 사용자가 탭 구조를 인식하지 못함, WCAG 2.1 4.1.2 위반
**권장:** 모든 탭 UI에 `role="tablist"`, 탭 버튼에 `role="tab"` + `aria-selected`, 탭 패널에 `role="tabpanel"` 적용
**심각도:** Medium

### [A11Y-M-02] 채팅 RoomList — 컨텍스트 메뉴 키보드 접근 불가 (Medium, 미수정)

**현상:** `RoomList.tsx`의 컨텍스트 메뉴가 `onContextMenu`(우클릭)로만 열림. 키보드 사용자나 터치 기기 사용자가 채팅방 이름변경/퇴장 기능에 접근할 수 없음
**위치:** `frontend/src/components/chat/RoomList.tsx`
**영향:** 키보드 전용 사용자의 채팅방 관리 기능 접근 차단
**권장:** 더보기(...) 버튼 추가 또는 Shift+F10 키바인딩 지원
**심각도:** Medium

### [A11Y-L-01] CandlestickChart 지표 토글 — 비활성 상태 시각적 구분 약화 (Low)

**현상:** `CandlestickChart.tsx:517-526`의 지표 토글 버튼이 비활성 상태에서 `border-border/40 text-text-quaternary`로 표시되며, 활성 상태에서는 지표 색상이 적용됨. 색각 이상(색맹) 사용자가 활성/비활성 상태를 구분하기 어려울 수 있음. 색상 원(color dot)의 opacity 차이(1 vs 0.35)만으로 구분
**위치:** `frontend/src/components/chart/CandlestickChart.tsx:517-531`
**영향:** 색각 이상 사용자의 지표 활성 상태 인식 어려움
**권장:** 체크마크 아이콘, 테두리 두께 변화 등 비색상 시각 표시 추가
**심각도:** Low

---

## C. 폼/입력 UX — 3건

### [FRM-M-01] 비밀번호 표시/숨기기 토글 미구현 (Medium, 미수정)

**현상:** 마이페이지 비밀번호 변경 모달에서 현재 비밀번호, 새 비밀번호, 확인 입력 필드 모두 `type="password"` 고정. 비밀번호 표시/숨기기 토글이 없어 입력 오류 확인이 어려움
**위치:** `frontend/src/app/(main)/mypage/page.tsx` (비밀번호 변경 모달)
**영향:** 복잡한 비밀번호 입력 시 오타 확인 불가로 사용자 좌절감 증가
**권장:** 각 비밀번호 필드에 Eye/EyeOff 아이콘 토글 버튼 추가
**심각도:** Medium

### [FRM-M-02] 입금/출금 BottomSheet — 닫기 시 입력값 미초기화 (Medium)

**현상:** `portfolio/page.tsx:369-419`의 입금 BottomSheet에서 금액을 입력하다가 시트를 닫으면(`onClose`) 입력 값이 `depositAmount` 상태에 남아있어 다음 열기 시 이전 값이 표시됨. 출금도 동일. 입금 성공 시에는 `setDepositAmount('')`으로 초기화하지만, 시트 닫기만 한 경우에는 미초기화
**위치:** `frontend/src/app/(main)/portfolio/page.tsx:371, 425`
**영향:** 사용자 혼란 — 이전에 입력하다 만 금액이 잔존
**권장:** BottomSheet `onClose` 콜백에서 `setDepositAmount('')` / `setWithdrawAmount('')` 호출
**심각도:** Medium

### [FRM-L-01] 주문 수정 취소 — editPrice/editQuantity 상태 미초기화 (Low)

**현상:** 주문 수정 모드에서 가격/수량을 변경한 후 취소 시 `editPrice`/`editQuantity` 상태가 이전 입력값을 유지. 다음 주문 수정 시 잘못된 초기값이 표시될 수 있음
**위치:** `frontend/src/app/(main)/orders/page.tsx` (주문 수정 섹션)
**영향:** 다른 주문 수정 시 이전 주문의 가격/수량이 초기값으로 나타남
**권장:** 수정 취소 시 `setEditPrice('')`/`setEditQuantity('')` 동시 초기화
**심각도:** Low

---

## D. 로딩/에러 상태 — 2건

### [LD-M-01] AI 분석 에러 — 에러 유형 미구분 (Medium)

**현상:** `dashboard/page.tsx:205-206`과 `news/page.tsx:189-190`에서 AI 분석 catch 블록이 모든 에러를 동일하게 `setAiError(true)`로 처리. 네트워크 에러, 타임아웃(60초), 서버 500 에러, AI 서비스 불가 등 원인별 안내 없음
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:205`, `frontend/src/app/(main)/news/page.tsx:189`
**영향:** 사용자가 재시도 가능 여부를 판단할 수 없음, 60초 대기 후 "오류 발생"만 표시
**권장:** 에러 유형별 메시지 분기 (timeout → "시간 초과, 재시도", 503 → "AI 서비스 일시 불가" 등)
**심각도:** Medium

### [LD-L-01] 리더보드 — 빈 상태 메시지가 목록 div 내부에 배치 (Low)

**현상:** `leaderboard/page.tsx:616-620`의 빈 상태 메시지(`leaderboard.empty`)가 `divide-y divide-border/40` 목록 div 내부에 위치하여 테이블 헤더와 빈 메시지 사이에 불필요한 구분선이 표시됨
**위치:** `frontend/src/app/(main)/leaderboard/page.tsx:616-620`
**영향:** 시각적 비일관성 — 빈 메시지 위에 불필요한 구분선
**권장:** 빈 상태를 목록 div 외부로 이동하거나, 조건부로 테이블 헤더도 숨김
**심각도:** Low

---

## E. 네비게이션/흐름 — 2건

### [NAV-M-01] 종목 상세 — 뒤로 가기 하드코딩 경로 (Medium)

**현상:** `asset/[symbol]/page.tsx:181`의 뒤로 가기 링크가 `href="/dashboard"`로 하드코딩. 커뮤니티, 포트폴리오, 검색, 리더보드 등 다양한 진입 경로에서 종목 상세에 접근할 수 있으나, 항상 대시보드로 돌아감
**위치:** `frontend/src/app/(main)/asset/[symbol]/page.tsx:181`
**영향:** 포트폴리오에서 종목 상세 진입 후 뒤로 가기 시 대시보드로 이동, 사용자 흐름 단절
**권장:** `router.back()` 사용 또는 `useSearchParams`로 referrer 경로 저장 후 해당 경로로 복귀
**심각도:** Medium

### [NAV-L-01] 포트폴리오 — 보유 종목 없음 시 대시보드 링크만 제공 (Low)

**현상:** `portfolio/page.tsx:332-344`에서 보유 종목이 없을 때 "종목 둘러보기" 링크만 대시보드로 연결. 거래 내역이 있는데 현재 보유 종목이 0인 경우(전량 매도), 거래 분석 탭으로의 안내가 없음
**위치:** `frontend/src/app/(main)/portfolio/page.tsx:332-344`
**영향:** 전량 매도 후 사용자가 자신의 거래 기록을 확인하려면 별도로 탭을 전환해야 함
**권장:** "거래 분석 보기" 링크를 추가하거나, 최근 거래 요약을 빈 상태 화면에 포함
**심각도:** Low

---

## F. 정보 구조/표시 — 2건

### [INF-M-01] 대시보드 AI 분석 — 분석 대상 뉴스 수 미표시 (Medium)

**현상:** 대시보드의 AI 분석 모달에서 "AI 시장 분석" 타이틀만 표시되고, 분석에 사용된 뉴스 건수(50건 중 실제 사용된 수), 분석 시간대(최근 24시간), 분석 날짜/시간 정보가 없음. 뉴스 페이지의 AI 분석에는 카테고리가 표시됨
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:425-512`
**영향:** 사용자가 분석의 범위와 시점을 알 수 없어 신뢰도 판단 어려움
**권장:** 모달 헤더에 "최근 24시간 / N건 뉴스 기반" 부가 정보 표시
**심각도:** Medium

### [INF-L-01] 주문 확인 모달 — 복잡한 문자열 연결 메시지 (Low)

**현상:** `OrderForm.tsx:400`의 주문 확인 모달 message가 문자열 연결(`\n`)로 구성되어 구조화된 정보 표시가 어려움. `${symbol} ${parsedQty} ${t('order.quantity')}\n${...}\n${...}` 형태로 가독성 저하
**위치:** `frontend/src/components/trading/OrderForm.tsx:400`
**영향:** 주문 확인 시 정보가 단순 텍스트로 나열되어 중요 정보(가격, 수량, 총액) 시인성 저하
**권장:** ConfirmModal에 구조화된 레이아웃(label-value 쌍) 적용 또는 별도 OrderConfirmModal 컴포넌트 생성
**심각도:** Low

---

## G. 검색/필터 UX — 2건

### [SRH-M-01] 뉴스 검색 — 활성 필터 상태 시각적 피드백 부족 (Medium)

**현상:** `news/page.tsx:121-132`에서 검색어와 날짜 필터가 동시 적용되어도 "N건 결과" 또는 "검색 중" 인디케이터가 없음. 기본 날짜 필터가 '24h'로 설정되어 있어, 사용자가 "전체 뉴스"를 기대하더라도 24시간 이내 뉴스만 표시되지만 이를 알려주는 시각적 단서가 부족
**위치:** `frontend/src/app/(main)/news/page.tsx:56, 121-132`
**영향:** 사용자가 필터 상태를 인지하지 못하고 뉴스가 적다고 오해
**권장:** 활성 필터 수 뱃지, "N건 결과" 카운터, 전체 필터 초기화 버튼 제공
**심각도:** Medium

### [SRH-L-01] AssetList 모바일 필터 — 필터 변경 시 자동 접힘 미구현 (Low)

**현상:** `AssetList.tsx:249-308`에서 모바일 필터 드롭다운이 펼쳐진 상태에서 카테고리/정렬/기간을 변경해도 드롭다운이 자동으로 접히지 않음. 사용자가 필터를 변경할 때마다 수동으로 드롭다운을 닫아야 함
**위치:** `frontend/src/components/market/AssetList.tsx:249-308`
**영향:** 모바일에서 필터 변경 후 드롭다운이 화면 공간을 계속 차지하여 자산 목록 가림
**권장:** `handleCategoryChange`, `handleSortChange`, `onPeriodChange` 호출 시 `setMobileFilterOpen(false)` 자동 실행
**심각도:** Low

---

## 종합 평가

4차 UX 감사에서 총 18건의 이슈를 발견하였습니다. 3차 대비 캔들스틱 차트 라이트 모드(CLR-M-01), 포트폴리오 차트 라이트 모드(CLR-M-02), 종목 상세 $0.00 로딩 상태(LD-M-01), 커뮤니티 탭 URL 동기화(NAV-M-01) 등 4건이 수정되었습니다.

이번 차수에서 새로 발견된 주요 UX 이슈:
1. **종목 상세 뒤로 가기 하드코딩** (NAV-M-01) — 다양한 진입 경로에서의 사용자 흐름 단절
2. **입금/출금 시트 입력값 미초기화** (FRM-M-02) — 이전 금액이 잔존하여 혼란 유발
3. **AI 분석 에러 유형 미구분** (LD-M-01) — 60초 대기 후 원인 불명의 에러 메시지

전체적으로 3차에서 지적된 라이트 모드 차트 가독성 문제가 해결되어 라이트 모드 사용자 경험이 크게 개선되었습니다. 그러나 ARIA 속성 적용(A11Y-M-01), 비밀번호 토글(FRM-M-01), OrderForm 반응형(RD-M-01)은 여전히 미수정으로 지속적인 개선이 필요합니다. 특히 다수 탭 UI에 대한 ARIA 역할 적용은 접근성 표준 준수를 위해 우선적으로 수행해야 합니다.
