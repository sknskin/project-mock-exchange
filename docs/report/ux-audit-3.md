# VirtuEx 사용자 UX 개선 감사 보고서 (3차)

**VirtuEx User Experience Improvement Audit Report (3rd)**

- 감사일: 2026-03-18
- 감사 범위: 모바일 반응형, 키보드 접근성, 폼/입력 UX, 로딩/에러 상태, 네비게이션 흐름, 색상/대비, 검색/필터 UX, 다크/라이트 모드 일관성
- 감사 방법: 컴포넌트별 반응형 클래스 분석, ARIA 속성 검사, UX 패턴 일관성 검토, WCAG 2.1 가이드라인 대조
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 발견 사항만 기록하며, 수정은 포함하지 않음

---

## 이전 감사 대비 수정 현황 (2차 → 3차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [A11Y-M-01] ARIA 속성 적용률 낮음 | **부분 수정** | 대시보드 tablist 역할 + aria-selected 적용. 기타 컴포넌트는 미적용 |
| [A11Y-M-02] 이미지 alt/lazy loading | 미수정 | DOMPurify 보안 트레이드오프 유지 |
| [FRM-M-01] 비밀번호 표시/숨기기 미구현 | 미수정 | 마이페이지 비밀번호 변경 모달에서 여전히 미구현 |
| [RD-M-01] OrderForm 반응형 전무 | **부분 수정** | 비율 수량 버튼에 `sm:py-1.5` 반응형 추가, 전체적으로는 여전히 제한적 |
| [RD-M-02] 대시보드 단일 대형 컴포넌트 | 미수정 | TODO 주석만 유지 |
| [RD-M-03] 리더보드 팔로우/카피 버튼 모바일 미표시 | **수정됨** | 모바일에서도 팔로우/카피 버튼이 `p-1` 크기로 표시됨 확인 |
| [UX-M-01] 백엔드 에러 한국어 하드코딩 | 미수정 | 에러 코드 체계 미도입 |
| [다크 모드 차트 색상 라이트 모드 불일치] | 미수정 | CandlestickChart 하드코딩 다크 색상 유지 (하단 CLR-M-01 참조) |

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 모바일 반응형 | 0 | 0 | 3 | 1 | 4 |
| B. 키보드/접근성 | 0 | 0 | 2 | 1 | 3 |
| C. 폼/입력 UX | 0 | 0 | 2 | 1 | 3 |
| D. 로딩/에러 상태 | 0 | 0 | 1 | 1 | 2 |
| E. 네비게이션/흐름 | 0 | 0 | 1 | 1 | 2 |
| F. 색상/대비/다크모드 | 0 | 0 | 2 | 0 | 2 |
| G. 검색/필터 UX | 0 | 0 | 1 | 1 | 2 |
| **합계** | **0** | **0** | **12** | **6** | **18** |

---

## A. 모바일 반응형 — 4건

### [RD-M-01] OrderForm — 반응형 클래스 제한적 (Medium, 부분 수정)

**현상:** `OrderForm.tsx`에 비율 수량 버튼의 `sm:py-1.5 sm:text-[11px]` 반응형이 추가되었으나, 전체적인 레이아웃, 입력 필드 크기, 여백에 반응형 클래스가 부족. 특히 `space-y-4 sm:space-y-5` 외에 모바일 특화 레이아웃이 없어 좁은 화면에서 폼 요소가 조밀하게 표시됨
**위치:** `frontend/src/components/trading/OrderForm.tsx:236`
**영향:** 모바일에서 주문 입력 시 터치 타겟이 좁고 시인성 저하
**권장:** Input 컴포넌트에 모바일 전용 높이/패딩 추가, 전체 폼 레이아웃 조정
**심각도:** Medium

### [RD-M-04] 주문 페이지 — 날짜 범위 필터 모바일 가로 오버플로우 (Medium)

**현상:** `orders/page.tsx:533-561`의 날짜 범위 필터에서 `<input type="date">` 2개 + 라벨 + 클리어 버튼이 `flex-wrap`으로 배치되지만, 좁은 화면에서 날짜 입력의 기본 너비가 넓어 두 줄로 넘어가면서 레이아웃이 깨질 수 있음
**위치:** `frontend/src/app/(main)/orders/page.tsx:533-561`
**영향:** 320px 미만 화면에서 필터 요소가 겹치거나 넘침
**권장:** 모바일에서 날짜 필터를 세로 스택으로 변경하거나, `max-w` 제한 추가
**심각도:** Medium

### [RD-M-05] 호가창 깊이 차트 — 모바일 터치 인터랙션 부재 (Medium)

**현상:** `OrderBook.tsx`의 깊이 차트(DepthChart SVG)에 터치 기반 인터랙션이 없음. 데스크톱 hover tooltip이 모바일에서 작동하지 않아 특정 가격/수량 정보를 확인할 수 없음
**위치:** `frontend/src/components/trading/OrderBook.tsx:68-245`
**영향:** 모바일 사용자가 깊이 차트에서 상세 정보 확인 불가
**권장:** 터치 탭 시 해당 레벨의 가격/수량 tooltip 표시, 또는 SVG 위에 투명 클릭 영역 추가
**심각도:** Medium

### [RD-L-01] 포트폴리오 히스토리 차트 — SVG preserveAspectRatio="none" (Low)

**현상:** `PortfolioHistoryChart.tsx:247-248`에서 SVG에 `preserveAspectRatio="none"` 설정. 화면 비율 변경 시 차트가 왜곡되어 데이터 시각화의 정확도 저하
**위치:** `frontend/src/components/portfolio/PortfolioHistoryChart.tsx:247-248`
**영향:** 와이드스크린에서 차트가 수평으로 늘어나 트렌드 인식 어려움
**권장:** `preserveAspectRatio="xMidYMid meet"` 또는 동적 높이 계산 적용
**심각도:** Low

---

## B. 키보드/접근성 — 3건

### [A11Y-M-01] ARIA 속성 — 커뮤니티/주문 탭에 role 미적용 (Medium, 부분 수정)

**현상:** 대시보드 탭 바에는 `role="tablist"` + `aria-selected`가 적용되었으나, 커뮤니티(`community/page.tsx:547-570`), 주문(`orders/page.tsx:476-498`), 포트폴리오(`portfolio/page.tsx:148-166`), 리더보드(`leaderboard/page.tsx:305-323`) 등의 탭 UI에는 ARIA 역할이 적용되지 않음
**위치:** `frontend/src/app/(main)/community/page.tsx:547`, `frontend/src/app/(main)/orders/page.tsx:476`
**영향:** 스크린 리더 사용자가 탭 구조를 인식하지 못함
**권장:** 모든 탭 UI에 `role="tablist"`, 탭 버튼에 `role="tab"` + `aria-selected`, 탭 패널에 `role="tabpanel"` 적용
**심각도:** Medium

### [A11Y-M-03] 채팅 RoomList — 컨텍스트 메뉴 키보드 접근 불가 (Medium)

**현상:** `RoomList.tsx:100-103`의 컨텍스트 메뉴가 `onContextMenu`(우클릭)로만 열림. 키보드 사용자나 터치 기기 사용자가 채팅방 이름변경/퇴장 기능에 접근할 수 없음
**위치:** `frontend/src/components/chat/RoomList.tsx:100-103`
**영향:** 키보드 전용 사용자의 채팅방 관리 기능 접근 차단
**권장:** 길게 눌러 열기(모바일) 또는 더보기(...)  버튼 추가, Shift+F10 키바인딩 지원
**심각도:** Medium

### [A11Y-L-01] CandlestickChart 지표 토글 — 시각적 전용 색상 인디케이터 (Low)

**현상:** `CandlestickChart.tsx:506-529`의 지표 토글 버튼이 색상 원(color dot)으로만 활성/비활성 상태를 표시. 색각 이상(색맹) 사용자가 활성 상태를 구분하기 어려움
**위치:** `frontend/src/components/chart/CandlestickChart.tsx:523-526`
**영향:** 색각 이상 사용자의 지표 활성 상태 인식 어려움
**권장:** 체크마크, 테두리 두께 변화 등 비색상 시각 표시 추가
**심각도:** Low

---

## C. 폼/입력 UX — 3건

### [FRM-M-01] 비밀번호 표시/숨기기 토글 미구현 (Medium, 미수정)

**현상:** `mypage/page.tsx:674-682`의 비밀번호 변경 모달에서 현재 비밀번호, 새 비밀번호, 확인 입력 필드 모두 `type="password"` 고정. 비밀번호 표시/숨기기 토글이 없어 입력 오류 확인이 어려움
**위치:** `frontend/src/app/(main)/mypage/page.tsx:674-682, 689-696, 716-722`
**영향:** 복잡한 비밀번호 입력 시 오타 확인 불가로 사용자 좌절감 증가
**권장:** 각 비밀번호 필드에 눈 아이콘(Eye/EyeOff) 토글 버튼 추가
**심각도:** Medium

### [FRM-M-02] 주문 수정 — 인라인 편집 모드 취소 시 값 미초기화 (Medium)

**현상:** `orders/page.tsx:392-396`의 `startEditing` 함수에서 주문 수정 모드 진입 시 현재 가격/수량을 `editPrice`/`editQuantity`에 설정. 사용자가 값을 변경한 후 취소(`setEditingOrderId(null)`)하면 `editPrice`/`editQuantity` 상태가 이전 입력값을 유지하여, 다음 주문 수정 시 잘못된 초기값 표시 가능
**위치:** `frontend/src/app/(main)/orders/page.tsx:392-396, 625`
**영향:** 다른 주문 수정 시 이전 주문의 가격/수량이 초기값으로 나타남
**권장:** `setEditingOrderId(null)` 호출 시 `setEditPrice('')`/`setEditQuantity('')` 동시 초기화
**심각도:** Medium

### [FRM-L-01] 입금/출금 — 금액 입력 후 시트 닫으면 잔여 값 유지 (Low)

**현상:** `portfolio/page.tsx:369-419`의 입금 BottomSheet에서 금액을 입력하다가 시트를 닫으면(`onClose`) 입력 값이 `depositAmount` 상태에 남아있어 다음 열기 시 이전 값이 표시됨. 출금도 동일
**위치:** `frontend/src/app/(main)/portfolio/page.tsx:369, 422`
**영향:** 사용자 혼란 — 이전에 입력하다 만 금액이 잔존
**권장:** `onClose` 콜백에서 `setDepositAmount('')` / `setWithdrawAmount('')` 호출
**심각도:** Low

---

## D. 로딩/에러 상태 — 2건

### [LD-M-01] 종목 상세 페이지 — 가격 미로드 시 0원 표시 (Medium)

**현상:** `asset/[symbol]/page.tsx:150`에서 `currentPrice` fallback이 `0`. REST API 응답 전 WebSocket 미연결 상태에서 `0`이 가격으로 표시됨. 매수/매도 버튼에도 `fp(0)`이 표시되어 "0원 매수" 혼란 유발
**위치:** `frontend/src/app/(main)/asset/[symbol]/page.tsx:150, 370-372`
**영향:** 초기 로드 시 "$0.00 매수" 버튼이 잠시 표시
**권장:** `currentPrice === 0`일 때 스켈레톤 또는 로딩 인디케이터 표시, 매수/매도 버튼 비활성화
**심각도:** Medium

### [LD-L-01] 리더보드 — 빈 상태 메시지가 목록 하단에 배치 (Low)

**현상:** `leaderboard/page.tsx:616-620`의 빈 상태 메시지(`leaderboard.empty`)가 `divide-y` 목록 div 내부에 위치하여 테이블 헤더와 빈 메시지 사이에 구분선이 표시됨
**위치:** `frontend/src/app/(main)/leaderboard/page.tsx:616-620`
**영향:** 시각적 비일관성 — 빈 메시지 위에 불필요한 구분선
**권장:** 빈 상태를 목록 div 외부로 이동하거나, 조건부로 테이블 헤더도 숨김
**심각도:** Low

---

## E. 네비게이션/흐름 — 2건

### [NAV-M-01] 커뮤니티 탭 — URL과 탭 상태 미동기화 (Medium)

**현상:** `community/page.tsx:306-310`에서 URL의 `?tab=` 파라미터로 초기 탭을 결정하지만, 탭 전환 시 URL을 업데이트하지 않음(`router.push` 미사용). 브라우저 뒤로 가기 시 이전 탭으로 돌아가지 않고, URL 공유 시 특정 탭을 직접 링크할 수 없음
**위치:** `frontend/src/app/(main)/community/page.tsx:306-313`
**영향:** 탭 전환 후 뒤로 가기 시 예상 동작과 불일치
**권장:** `setTab` 시 `router.replace(`/community?tab=${v}`, { scroll: false })` 적용
**심각도:** Medium

### [NAV-L-01] 종목 상세 — 뒤로 가기 하드코딩 경로 (Low)

**현상:** `asset/[symbol]/page.tsx:181`의 뒤로 가기 링크가 `href="/dashboard"`로 하드코딩. 커뮤니티, 포트폴리오, 검색 등 다양한 진입 경로에서 종목 상세에 접근할 수 있으나, 항상 대시보드로 돌아감
**위치:** `frontend/src/app/(main)/asset/[symbol]/page.tsx:181`
**영향:** 포트폴리오에서 종목 상세 진입 후 뒤로 가기 시 대시보드로 이동
**권장:** `router.back()` 사용 또는 `useSearchParams`로 referrer 경로 저장
**심각도:** Low

---

## F. 색상/대비/다크모드 — 2건

### [CLR-M-01] CandlestickChart — 다크 모드 전용 하드코딩 색상 (Medium, 미수정)

**현상:** `CandlestickChart.tsx:131-155`에서 차트 배경/그리드/크로스헤어 색상이 다크 모드 기준으로 하드코딩. `textColor: '#6B7683'`, `vertLines: { color: 'rgba(255,255,255,0.04)' }` 등이 라이트 모드에서는 거의 보이지 않거나 부적절
**위치:** `frontend/src/components/chart/CandlestickChart.tsx:131-155, 204-228`
**영향:** 라이트 모드에서 차트 그리드선/텍스트가 사실상 투명, 차트 가독성 매우 저하
**권장:** `useSettingsStore`의 `theme`에 따라 차트 옵션 분기, 라이트 모드용 색상 팔레트 별도 정의
**심각도:** Medium

### [CLR-M-02] PortfolioHistoryChart — SVG 라이트 모드 가독성 문제 (Medium)

**현상:** `PortfolioHistoryChart.tsx:288-295`의 SVG 텍스트/가이드라인 색상이 다크 모드 기준(`fill="#808A98"`, `stroke="#2A2A32"`). 라이트 모드에서 배경색과 비슷하여 Y축 라벨과 가이드 라인이 보이지 않음
**위치:** `frontend/src/components/portfolio/PortfolioHistoryChart.tsx:288-296`
**영향:** 라이트 모드에서 포트폴리오 차트의 축 정보 식별 불가
**권장:** CSS 변수 또는 theme 조건부로 텍스트/가이드 색상 전환
**심각도:** Medium

---

## G. 검색/필터 UX — 2건

### [SRH-M-01] 뉴스 검색 — 검색어 미입력 시 전체 조회 UX 불명확 (Medium)

**현상:** `news/page.tsx:121-132`에서 검색어가 비어있으면 전체 뉴스가 표시되지만, 날짜 필터가 기본값 '24h'로 설정되어 있어 사용자가 "전체 뉴스"를 기대하더라도 24시간 이내 뉴스만 표시. 필터 조합에 대한 시각적 피드백 부족
**위치:** `frontend/src/app/(main)/news/page.tsx:56, 121-132`
**영향:** 사용자가 필터 상태를 인지하지 못하고 뉴스가 적다고 오해
**권장:** 활성 필터 수 또는 "N건 필터됨" 뱃지 표시, 전체 초기화 버튼 제공
**심각도:** Medium

### [SRH-L-01] 커뮤니티 전략 검색 — 필터 결과 카운트 미표시 (Low)

**현상:** `community/page.tsx:780-814`의 전략 목록에서 심볼 필터 + 검색어 적용 결과의 총 건수가 표시되지 않음. 페이지네이션은 있으나 "N건 중 M건 표시" 정보 부재
**위치:** `frontend/src/app/(main)/community/page.tsx:780-825`
**영향:** 사용자가 필터 결과의 전체 규모를 파악할 수 없음
**권장:** 전략 목록 상단에 `strategiesData.total`건 표시 추가
**심각도:** Low

---

## 종합 평가

3차 UX 감사에서 총 18건의 이슈를 발견하였습니다. 2차 대비 리더보드 모바일 팔로우/카피 버튼(RD-M-03)이 수정되고, ARIA 속성이 대시보드에 부분 적용되었으나, OrderForm 반응형(RD-M-01), 비밀번호 표시/숨기기(FRM-M-01), 다크 모드 차트 색상(CLR-M-01) 등은 여전히 미수정입니다.

이번 차수에서 새로 발견된 주요 UX 이슈:
1. **차트 라이트 모드 가독성 문제** (CLR-M-01/02) — 라이트 모드 사용자에게 차트가 사실상 사용 불가
2. **종목 상세 0원 표시** (LD-M-01) — 초기 로드 시 잘못된 가격 정보로 혼란
3. **커뮤니티 탭 URL 미동기화** (NAV-M-01) — 브라우저 뒤로 가기 동작 불일치

전체적으로 프로젝트의 UX 기반은 양호하나, 라이트 모드 지원과 모바일 최적화에서 추가 개선이 필요합니다. 특히 차트 컴포넌트의 다크 모드 전용 하드코딩은 라이트 모드 사용자의 핵심 기능 접근성을 심각하게 제한하므로 우선 수정을 권장합니다.
