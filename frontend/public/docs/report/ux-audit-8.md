# VirtuEx 사용자 UX 개선 감사 보고서 (8차)

**VirtuEx User Experience Improvement Audit Report (8th)**

- 감사일: 2026-03-28
- 감사 범위: 애니메이션/트랜지션, 타이포그래피/가독성, 종합 사용자 경험 개선, 7차 감사 수정 현황 확인, 모바일 반응형, 접근성(ARIA/포커스), 폼/입력 UX, 로딩/에러 상태, 네비게이션 흐름, 정보 구조, 모달/다이얼로그, 모바일 사용성
- 감사 방법: 소스 코드 직접 분석 (globals.css, page.tsx, component.tsx 전체), CSS 트랜지션/애니메이션 클래스 검사, WCAG 2.1 AA 기준 대비 비율 계산, Tailwind 유틸리티 클래스 및 font-variant-numeric 사용 패턴 분석
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 7차 대비 수정 현황을 검증하고, 대규모 UX 개선 패치 이후 잔여 이슈를 중점 분석합니다

---

## 이전 감사 대비 수정 현황 (7차 → 8차)

### A. 애니메이션/트랜지션 — 6건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [ANI-H-01] 페이지 간 전환 애니메이션 부재 | 미수정 | `ScrollToTop.tsx`에서 `behavior: 'smooth'` 적용 확인(커밋 `b4eb3d0`). 다만 페이지 콘텐츠 자체의 fade/slide 전환은 여전히 미적용 |
| [ANI-M-01] Tabs 탭 전환 언더라인 점프 | **수정됨** | `Tabs.tsx`에서 CSS `transition` 기반 슬라이딩 언더라인 구현 + `role="tabpanel"` 추가 확인 (커밋 `d023287`) |
| [ANI-M-02] 리스트 아이템 로딩 스태거 부재 | **수정됨** | `AssetList.tsx:357-358`에서 `animate-list-stagger` 클래스 적용 확인 (커밋 `4d8fd58`) |
| [ANI-M-03] 스켈레톤 → 실제 콘텐츠 하드 스왑 | **수정됨** | 차트 로딩 시 fade-in 애니메이션 추가 확인 (커밋 `75d6f46`) |
| [ANI-L-01] 드롭다운 닫힘 애니메이션 부재 | 미수정 | 조건부 렌더링 즉시 사라짐 유지 |
| [ANI-L-02] 모달 닫힘 애니메이션 부재 | **수정됨** (BottomSheet) | `BottomSheet.tsx`에서 `isClosing` 상태 추가 + 닫힘 애니메이션(opacity + translateY slide-down) 적용 확인 (커밋 `6efe8aa`). 다만 `ConfirmModal`, `ContentModal`은 미적용 |

### B. 타이포그래피/가독성 — 5건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [TYP-M-01] body line-height 미설정 | 미수정 | `globals.css`에서 `line-height` 명시 없음 유지 |
| [TYP-M-02] 헤더 네비게이션 13px | 미수정 | `Header.tsx`에서 `text-[13px] xl:text-[14px]` 유지 |
| [TYP-L-01] 금융 데이터 시스템 폰트 의존 | 미수정 | Pretendard `tabular-nums` 의존 유지 |
| [TYP-L-02] h1~h3 일관성 부족 | 미수정 | 시맨틱 헤딩 태그 미적용 유지 |
| [TYP-L-03] BottomNav 라벨 11px | **수정됨** | 커밋 `b4eb3d0`에서 `text-[12px]` + `aria-current` 적용 확인 |

### C. 사용자 경험 개선 — 5건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [UX-M-01] 온보딩 안내 부재 | **수정됨** | `OnboardingGuide.tsx` 컴포넌트 생성 확인. `useFocusTrap` 활용 |
| [UX-M-02] 마지막 업데이트 표시 부재 | **수정됨** | `dashboard/page.tsx`에서 `lastUpdated` 상태 + `formatLastUpdated()` 함수로 마지막 데이터 갱신 시각 표시 확인 |
| [UX-M-03] 키보드 단축키 발견성 부족 | **수정됨** | `KeyboardShortcutsHelp.tsx` 컴포넌트 생성 확인. `useFocusTrap` 활용 |
| [UX-L-01] 스크롤 위치 보존 미유지 | **수정됨** | `next.config.ts:7`에서 `scrollRestoration: true` 설정 확인 (커밋 `6070425`) |
| [UX-L-02] 브레이크포인트 전환 불연속 | **수정됨** | `BottomNav` 브레이크포인트 조정 확인 (커밋 `8c247e2`) |

### D. 모바일 반응형 — 5건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [RD-M-01] OrderForm 모바일 높이/패딩 미적용 | **수정됨** | 커밋 `0a9009f`에서 모바일 터치 타겟 44px 확보 + `focus-visible:ring` 적용 확인 |
| [RD-M-02] 종목 상세 safe-bottom + pb-8 중복 | **수정됨** | 커밋 `738c23f`에서 하단 버튼 BottomNav 겹침 해소 확인 |
| [RD-M-03] 주문 분석 탭 320px 가독성 저하 | 미수정 | 24시간 바 차트 `text-[9px]`/`text-[10px]` 유지. 다만 AnalysisTab이 별도 컴포넌트로 분리됨 |
| [RD-L-01] 포트폴리오 Market Pulse 단일 열 | 미수정 | `grid-cols-1 sm:grid-cols-2` 유지 |
| [RD-L-02] 뉴스 AI 분석 버튼 320px 넘침 | 미수정 | 탭 바 + AI 버튼 동일 행 배치 유지 |

### E. 접근성 (A11Y) — 8건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [A11Y-M-01] 인라인 탭 ARIA 미적용 | **수정됨** | `Tabs.tsx`에서 `role="tablist"`, `role="tab"`, `aria-selected` 전체 적용 확인. `TabPanel` 래퍼에 `role="tabpanel"` + `aria-labelledby` 확인 |
| [A11Y-M-02] Tabs role="tabpanel" 미구현 | **수정됨** | `Tabs.tsx:118-132`에서 `TabPanel` 컴포넌트 추가. `role="tabpanel"` + `id` + `aria-labelledby` 자동 연결 확인 |
| [A11Y-M-03] RoomList 컨텍스트 메뉴 키보드 접근 불가 | 미수정 | `onContextMenu` 전용 유지 |
| [A11Y-M-04] SpotlightSearch 포커스 트랩 부재 | **수정됨** | `SpotlightSearch.tsx`에서 `useFocusTrap` 적용 확인 |
| [A11Y-M-05] 관심종목 Star/Bell 버튼 aria-label 누락 | 미수정 | `aria-label` 미적용 유지 |
| [A11Y-L-01] CandlestickChart 지표 토글 비색상 구분 부재 | **수정됨** | 색맹 대응 ▲▼ 화살표 추가 확인 (커밋 `4d8fd58`) |
| [A11Y-L-02] Input label htmlFor 미연결 | **수정됨** | `Input.tsx`에서 `htmlFor`로 라벨-입력 필드 연결 + `aria-describedby`로 에러 메시지 연결 확인 (커밋 `96c8505`) |
| [A11Y-L-03] BottomNav aria-current 미적용 | **수정됨** | 커밋 `b4eb3d0`에서 활성 링크에 `aria-current` 적용 확인 |

### F. 폼/입력 UX — 4건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [FRM-M-01] BottomSheet 닫기 시 입력값 미초기화 | **수정됨** | 커밋 `673e7ef`에서 폼 닫기 시 초기화 구현 확인 |
| [FRM-M-02] 주문 수정 취소 시 editPrice/editQuantity 미초기화 | **수정됨** | `OrderEditModal` 별도 컴포넌트로 분리되면서 모달 닫힘 시 상태 초기화 구현 확인 |
| [FRM-M-03] 주문 수정 입력 필드 포커스 링 미적용 | **수정됨** | 커밋 `0a9009f`에서 `focus-visible:ring` 적용 확인 |
| [FRM-L-01] Button focus: vs focus-visible: | **수정됨** | `focus-visible:ring` 패턴으로 전환 확인 |

### G. 로딩/에러 상태 — 3건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [LD-M-01] AI 분석 에러 유형 미구분 | **수정됨** | `ServiceError.tsx`에서 에러 타입 분기 처리 확인 (커밋 `96c8505`). 네트워크/서버/인증 에러 각각 다른 메시지 및 액션 제공 |
| [LD-M-02] 뉴스 스켈레톤 비구조화 pulse | 미수정 | `animate-pulse` 단순 직사각형 유지 |
| [LD-L-01] 마이페이지 프로필 로딩 텍스트만 표시 | 미수정 | 텍스트 로딩 유지. 다만 `ProfileSection` 분리로 로딩 범위가 한정됨 |

### H. 네비게이션/흐름 — 3건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [NAV-M-01] 종목 상세 뒤로 가기 하드코딩 | **수정됨** | 커밋 `738c23f`에서 `router.back()` 적용 확인 |
| [NAV-M-02] 뉴스 검색 활성 필터 상태 피드백 부족 | **수정됨** (부분) | 대시보드에서 URL params 기반 딥링크 지원 확인 (커밋 기반). 뉴스 페이지는 부분 적용 |
| [NAV-L-01] 포트폴리오 빈 상태 거래 분석 링크 부재 | 미수정 | 대시보드 링크만 제공 유지 |

### I. 정보 구조/표시 — 4건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [INF-M-01] 대시보드 AI 분석 범위 정보 미표시 | **수정됨** | `AiAnalysisModal.tsx` 공통 컴포넌트에서 분석 범위/시간 정보 표시 확인 |
| [INF-M-02] 주문 확인 모달 비구조화 텍스트 | 미수정 | `\n` 연결 형태 유지 |
| [INF-L-01] 리더보드 빈 상태 구분선 불필요 표시 | 미수정 | `divide-y` 내부 배치 유지 |
| [INF-L-02] AssetList 모바일 필터 변경 시 자동 접힘 미구현 | 미수정 | `setMobileFilterOpen(false)` 미호출 유지 |

### J. 모달/다이얼로그 — 3건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [MOD-M-01] 뉴스 AI 분석 모달 포커스 트랩 미적용 | **수정됨** | `AiAnalysisModal.tsx`에서 `useFocusTrap` 적용 확인 |
| [MOD-M-02] MarketIndexModal 포커스 트랩 미적용 | **수정됨** | `MarketIndexModal.tsx`에서 `useFocusTrap` 적용 확인 |
| [MOD-M-03] UserProfileModal 포커스 트랩 미적용 | **수정됨** | `UserProfileModal.tsx`(별도 분리)에서 `useFocusTrap` 적용 확인 |

### K. 기타 — 1건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [ETC-L-01] 이미지 alt 텍스트 가이드라인 부재 | 미수정 | 가이드라인 수립 미진행 |

### L~Q. 보충 감사 — 6건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [COLOR-M-01] 색각 접근성 — 상승/하락 색상만 의존 | **수정됨** | ▲▼ 화살표 추가로 비색상 구분 확인 (커밋 `4d8fd58`) |
| [CHART-M-01] CandlestickChart role="img" + aria-label 미적용 | **수정됨** | `CandlestickChart.tsx:539-544`에서 `role="img"` + `aria-label`로 가격 정보 제공 확인 |
| [FORM-M-01] OrderForm 소수점 입력 실시간 검증 부재 | **수정됨** | `OrderForm.tsx`에서 종목 유형별 소수점 자릿수 실시간 검증 + 에러 메시지 표시 확인 |
| [ASYNC-M-01] 비동기 버튼 로딩 상태 미제공 | **수정됨** | `AsyncButton.tsx` 컴포넌트 생성 확인 (커밋 `d023287`) |
| [404-L-01] 404 페이지 네비게이션 미제공 | **수정됨** | 커밋 `79a9a28`에서 대시보드/도움말 링크 추가 확인 |
| [SORT-M-01] 리더보드 테이블 정렬 방향 표시 부재 | **수정됨** | `leaderboard/page.tsx:474-488`에서 정렬 방향 화살표 + `aria-sort` 적용 확인 |

### R. 모바일 사용성 심층 감사 — 18건

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [MOB-C-01] OrderBook 모바일 오버플로 | **수정됨** | `OrderBook.tsx:317-319`에서 `overflow-x-auto` 추가 확인 (커밋 `8c247e2`) |
| 기타 17건 | 부분 수정 | 터치 타겟 44px 확보, BottomNav 겹침 해소, 입력 필드 개선 등 일부 개선 확인. 텍스트 클리핑, 소형 요소 등 일부 미수정 |

**요약:** 7차에서 지적된 74건 중 **약 40건 수정, 34건 미수정**.

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 애니메이션/트랜지션 (잔여) | 0 | 1 | 0 | 1 | 2 |
| B. 타이포그래피/가독성 (잔여) | 0 | 0 | 2 | 2 | 4 |
| C. 모바일 반응형 (잔여) | 0 | 0 | 1 | 2 | 3 |
| D. 접근성 (잔여) | 0 | 0 | 2 | 0 | 2 |
| E. 로딩/에러 상태 (잔여) | 0 | 0 | 1 | 1 | 2 |
| F. 네비게이션/흐름 (잔여) | 0 | 0 | 0 | 1 | 1 |
| G. 정보 구조/표시 (잔여) | 0 | 0 | 1 | 2 | 3 |
| H. 기타 (잔여) | 0 | 0 | 0 | 1 | 1 |
| I. 모바일 사용성 (잔여) | 0 | 0 | 5 | 6 | 11 |
| **합계** | **0** | **1** | **12** | **16** | **29** |

---

## A. 애니메이션/트랜지션 — 2건 (잔여)

### [ANI-H-01] 페이지 간 전환 애니메이션 부재 — 하드 컷 (미수정)
- **현상**: `ScrollToTop.tsx`에서 `behavior: 'smooth'` 스크롤이 적용되었으나, 페이지 콘텐츠 자체의 fade/slide 전환은 없음. `MainContent.tsx`에 채팅 사이드바 margin 전환은 있으나 페이지 콘텐츠 교체는 즉시 실행됨
- **위치**: `frontend/src/components/layout/ScrollToTop.tsx`, `frontend/src/components/layout/MainContent.tsx`
- **영향**: 페이지 전환 시 하드 컷으로 인해 SPA 특유의 매끄러운 경험 부재
- **권장**: `View Transitions API` (Next.js 15 `unstable_ViewTransition`) 적용 또는 `MainContent` 내부 CSS opacity 기반 fade 전환
- **심각도**: High

### [ANI-L-01] 드롭다운 메뉴 닫힘 — 애니메이션 부재 (미수정)
- **현상**: 헤더 사용자 메뉴, 주문 StatusDropdown 등 드롭다운 열림 시 애니메이션 있으나 닫힘 시 즉시 사라짐
- **위치**: `frontend/src/components/layout/Header.tsx`, `frontend/src/components/orders/StatusDropdown.tsx`
- **영향**: 열림/닫힘 비대칭으로 사용자 인지 저하
- **권장**: 닫힘 시 `animate-dropdown-out` (opacity 1→0, 150ms) 적용
- **심각도**: Low

---

## B. 타이포그래피/가독성 — 4건 (잔여)

### [TYP-M-01] body line-height 미설정 (미수정)
- **현상**: `globals.css`에서 `body`의 `line-height`를 명시하지 않음. Tailwind 기본 `normal`(약 1.2)로 본문 가독성 최적 범위(1.5~1.7) 미달
- **위치**: `frontend/src/app/globals.css`
- **영향**: 한글 텍스트에서 줄 간격이 좁아 장문 가독성 저하
- **권장**: `body`에 `line-height: 1.6` 적용
- **심각도**: Medium

### [TYP-M-02] 헤더 네비게이션 13px 가독성 부족 (미수정)
- **현상**: `Header.tsx`의 데스크톱 네비게이션 링크가 `text-[13px] xl:text-[14px]`으로 설정
- **위치**: `frontend/src/components/layout/Header.tsx`
- **영향**: 96dpi 일반 모니터에서 가독성 부족 가능
- **권장**: 최소 `text-[14px]`로 상향
- **심각도**: Medium

### [TYP-L-01] 금융 데이터 시스템 폰트 의존 (미수정)
- **현상**: 가격/수량 데이터에 Pretendard `tabular-nums` 의존. 전용 모노스페이스 폰트 미사용
- **위치**: 프로젝트 전체 38개 파일
- **영향**: 브라우저별 `tabular-nums` 렌더링 차이로 숫자 정렬 불일관 가능
- **권장**: 금융 데이터 전용 폰트 검토
- **심각도**: Low

### [TYP-L-02] h1~h3 시맨틱 헤딩 일관성 부족 (미수정)
- **현상**: 내부 페이지에서 `<h1>` 태그 없이 `<div>`/`<span>`으로 제목 렌더링. 다만 종목 상세 페이지에서 `<h1>` title 추가 확인 (커밋 `738c23f`)
- **위치**: 포트폴리오, 주문, 리더보드, 뉴스 페이지
- **영향**: 스크린 리더 페이지 제목 인식 불가
- **권장**: 각 페이지 최상단에 `<h1>` 적용
- **심각도**: Low

---

## C. 모바일 반응형 — 3건 (잔여)

### [RD-M-03] 주문 분석 탭 320px 가독성 저하 (미수정)
- **현상**: 24시간 바 차트가 320px에서 각 약 10px 너비, `text-[9px]`/`text-[10px]` 라벨 겹침
- **위치**: `frontend/src/components/orders/AnalysisTab.tsx`
- **영향**: 320px에서 시간대별 차트 정보 전달 불가
- **권장**: 모바일에서 12시간 단위 그룹핑 또는 가로 스크롤 적용
- **심각도**: Medium

### [RD-L-01] 포트폴리오 Market Pulse 단일 열 그리드 (미수정)
- **현상**: `grid-cols-1 sm:grid-cols-2` 유지. 10개+ 보유 종목 시 모바일 과도한 세로 스크롤
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx`
- **영향**: 다수 보유 종목 시 모바일 스크롤 과다
- **권장**: 모바일 컴팩트 레이아웃 적용
- **심각도**: Low

### [RD-L-02] 뉴스 AI 분석 버튼 320px 넘침 (미수정)
- **현상**: AI 분석 버튼(`min-w-[120px]`)과 3개 카테고리 탭이 320px에서 넘침
- **위치**: `frontend/src/app/(main)/news/page.tsx`
- **영향**: 320px에서 AI 분석 버튼 또는 카테고리 탭 잘림
- **권장**: 모바일에서 아이콘만 표시 또는 별도 행 배치
- **심각도**: Low

---

## D. 접근성 (A11Y) — 2건 (잔여)

### [A11Y-M-03] RoomList 컨텍스트 메뉴 키보드 접근 불가 (미수정)
- **현상**: 채팅 RoomList에서 `onContextMenu` 전용으로 우클릭만 지원. 키보드 사용자가 메뉴에 접근할 수 없음
- **위치**: 채팅 관련 컴포넌트
- **영향**: WCAG 2.1 2.1.1 키보드 접근성 위반
- **권장**: `onKeyDown`에서 `Shift+F10` 또는 `Enter` 키로 컨텍스트 메뉴 열기 지원
- **심각도**: Medium

### [A11Y-M-05] 관심종목 Star/Bell 버튼 aria-label 누락 (미수정)
- **현상**: 종목 상세 페이지의 관심종목/알림 버튼에 `aria-label` 없음
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx`
- **영향**: 스크린 리더 사용자가 버튼 기능 인지 불가
- **권장**: `aria-label="관심종목 추가"` / `aria-label="가격 알림 설정"` 적용
- **심각도**: Medium

---

## E. 로딩/에러 상태 — 2건 (잔여)

### [LD-M-02] 뉴스 스켈레톤 비구조화 pulse (미수정)
- **현상**: 뉴스 페이지 스켈레톤이 `animate-pulse` 단순 직사각형으로 실제 콘텐츠 구조와 불일치
- **위치**: 뉴스 페이지 로딩 상태
- **영향**: 스켈레톤과 실제 콘텐츠 간 레이아웃 차이로 CLS 발생 가능
- **권장**: 실제 카드 구조를 반영한 구조화 스켈레톤 적용
- **심각도**: Medium

### [LD-L-01] 마이페이지 프로필 로딩 텍스트만 표시 (미수정)
- **현상**: `ProfileSection` 분리로 로딩 범위가 한정되었으나 텍스트 로딩 유지
- **위치**: `frontend/src/components/mypage/ProfileSection.tsx`
- **영향**: 사용자 경험 저하
- **권장**: 프로필 카드 형태의 스켈레톤 적용
- **심각도**: Low

---

## F. 네비게이션/흐름 — 1건 (잔여)

### [NAV-L-01] 포트폴리오 빈 상태 거래 분석 링크 부재 (미수정)
- **현상**: 포트폴리오에 보유 자산이 없을 때 대시보드 링크만 제공. 주문/거래 분석 페이지 링크 부재
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx`
- **영향**: 신규 사용자의 거래 기능 발견성 부족
- **권장**: "거래 시작하기" → `/orders` 링크 추가
- **심각도**: Low

---

## G. 정보 구조/표시 — 3건 (잔여)

### [INF-M-02] 주문 확인 모달 비구조화 텍스트 (미수정)
- **현상**: 주문 확인 모달에서 주문 정보를 `\n` 연결 텍스트로 표시
- **위치**: 주문 관련 컴포넌트
- **영향**: 주문 정보 가독성 저하, 실수로 인한 오주문 가능
- **권장**: key-value 테이블 형태로 구조화
- **심각도**: Medium

### [INF-L-01] 리더보드 빈 상태 구분선 불필요 표시 (미수정)
- **현상**: 리더보드에 데이터가 없을 때 `divide-y` 구분선이 빈 공간에 표시
- **위치**: `frontend/src/app/(main)/leaderboard/page.tsx`
- **영향**: 시각적 불일관
- **권장**: 빈 상태 시 구분선 비활성화
- **심각도**: Low

### [INF-L-02] AssetList 모바일 필터 변경 시 자동 접힘 미구현 (미수정)
- **현상**: 모바일에서 필터 변경 후 필터 패널이 자동으로 접히지 않음
- **위치**: `frontend/src/components/market/AssetList.tsx`
- **영향**: 모바일 화면 공간 낭비
- **권장**: 필터 선택 시 `setMobileFilterOpen(false)` 호출
- **심각도**: Low

---

## H. 기타 — 1건 (잔여)

### [ETC-L-01] 이미지 alt 텍스트 가이드라인 부재 (미수정)
- **현상**: 프로젝트 전체에 일관된 이미지 alt 텍스트 가이드라인 부재
- **위치**: 프로젝트 전체
- **영향**: 접근성 및 SEO 저하
- **권장**: alt 텍스트 작성 가이드라인 수립 (장식 이미지: `alt=""`, 기능 이미지: 기능 설명, 콘텐츠 이미지: 내용 설명)
- **심각도**: Low

---

## I. 모바일 사용성 — 11건 (잔여, R. 카테고리에서 이관)

7차 R. 모바일 사용성 심층 감사에서 지적된 18건 중 7건이 수정되었습니다 (터치 타겟 44px, BottomNav 겹침 해소, OrderBook 오버플로, 입력 필드 개선 등). 잔여 11건은 텍스트 클리핑(2건 Medium), 소형 터치 요소(2건 Medium), 콘텐츠 오버플로(1건 Medium), 모달 높이(1건 Low) 등 세부 모바일 최적화 항목입니다. 개별 이슈는 7차 보고서 R. 섹션을 참조하시기 바랍니다.

---

## 종합 평가

7차 감사에서 지적된 74건 중 **약 40건(54.1%)이 수정**되어 전반적인 UX 품질이 크게 향상되었습니다.

### 주요 개선 사항
1. **탭 접근성 완성**: `Tabs.tsx`에 `role="tablist"`, `role="tab"`, `aria-selected`, `TabPanel`(`role="tabpanel"`)이 전면 적용되어 WCAG 2.1 4.1.2를 준수합니다.
2. **모달 포커스 트랩 3건 완료**: `AiAnalysisModal`, `MarketIndexModal`, `UserProfileModal` 모두 `useFocusTrap` 적용으로 키보드 접근성이 확보되었습니다.
3. **BottomSheet 닫힘 애니메이션**: `isClosing` 상태 + opacity/translateY 애니메이션으로 열림/닫힘 대칭이 구현되었습니다.
4. **새 기능 추가**: `OnboardingGuide`(첫 방문 안내), `KeyboardShortcutsHelp`(단축키 도움말) 컴포넌트가 생성되어 기능 발견성이 크게 향상되었습니다.
5. **색맹 접근성**: ▲▼ 화살표를 통한 비색상 구분이 적용되어 상승/하락 표시가 색각 이상자에게도 전달됩니다.
6. **Input 접근성**: `htmlFor` + `aria-describedby` 연결로 라벨-입력 필드-에러 메시지 간 관계가 명확해졌습니다.
7. **스크롤 보존**: `scrollRestoration: true` 설정으로 뒤로 가기 시 스크롤 위치가 유지됩니다.
8. **딥링크 지원**: 대시보드에서 URL params(`tab`, `period`) 기반 상태 복원이 구현되었습니다.
9. **데이터 실시간성**: 대시보드에 마지막 데이터 갱신 시각 표시가 추가되었습니다.
10. **formatPercent 통일**: 백분율 표시가 소수점 2자리로 일관되게 통일되었습니다.

### 잔여 이슈
- **ANI-H-01 (High)**: 페이지 간 전환 애니메이션이 유일한 High 등급 이슈로 남아 있습니다. View Transitions API 도입을 권장합니다.
- **타이포그래피 (Medium 2건)**: body line-height와 네비게이션 폰트 크기는 글로벌 스타일 변경이 필요합니다.
- **모바일 잔여 (11건)**: 대부분 Low/Medium 등급의 세부 최적화 항목입니다.

### UX 점수: **85/100** (7차: 52/100 대비 +33점)

| 항목 | 점수 | 비고 |
|------|------|------|
| 접근성 (ARIA/포커스) | 18/20 | RoomList 키보드, Star/Bell aria-label 잔여 -2 |
| 애니메이션/트랜지션 | 16/20 | 페이지 전환 하드 컷 -4 |
| 타이포그래피 | 16/20 | body line-height, 네비 13px -4 |
| 모바일 반응형 | 17/20 | 분석 탭 320px, 모바일 잔여 -3 |
| 기능 발견성 | 18/20 | 온보딩/단축키 추가. 포트폴리오 빈 상태 링크 부재 -2 |
