# VirtuEx 사용자 UX 개선 감사 보고서 (7차)

**VirtuEx User Experience Improvement Audit Report (7th)**

- 감사일: 2026-03-24
- 감사 범위: 애니메이션/트랜지션, 타이포그래피/가독성, 종합 사용자 경험 개선, 6차 감사 수정 현황 확인, 모바일 반응형, 접근성(ARIA/포커스), 폼/입력 UX, 로딩/에러 상태, 네비게이션 흐름, 정보 구조, 모달/다이얼로그, **모바일 사용성 심층 감사(텍스트 클리핑, 모달, 소형 요소, 콘텐츠 오버플로, 하단 네비 겹침, 입력 필드)**
- 감사 방법: 소스 코드 직접 분석 (globals.css, page.tsx, component.tsx 전체), CSS 트랜지션/애니메이션 클래스 검사, WCAG 2.1 AA 기준 대비 비율 계산, Tailwind 유틸리티 클래스 및 font-variant-numeric 사용 패턴 분석
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 6차 대비 수정 현황을 검증하고, 신규 확장 범위(애니메이션/트랜지션, 타이포그래피/가독성, 종합 UX 개선)를 중점 분석함

---

## 이전 감사 대비 수정 현황 (6차 → 7차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [RD-M-01] OrderForm 모바일 전용 높이/패딩 미적용 | **미수정** | `OrderForm.tsx:247-404` 가격/수량 Input `h-12`, 주문 버튼 `h-[52px]` 모바일 전용 클래스 여전히 없음 |
| [RD-M-02] 종목 상세 고정 매수/매도 바 safe-bottom + pb-8 중복 | **미수정** | `asset/[symbol]/page.tsx:520` `safe-bottom px-4 py-3 pb-8` 그대로 유지 |
| [RD-M-03] 주문 분석 탭 24시간 바 차트 320px 가독성 저하 | **미수정** | `orders/page.tsx:261-300` 24개 바 + `text-[9px]`/`text-[10px]` 유지 |
| [RD-L-01] 포트폴리오 Market Pulse 단일 열 그리드 | **미수정** | `grid-cols-1 sm:grid-cols-2` 유지 |
| [RD-L-02] 뉴스 AI 분석 버튼 320px 넘침 | **미수정** | 탭 바 + AI 버튼 동일 행 배치 유지 |
| [A11Y-M-01] 인라인 탭 5개 페이지 ARIA 미적용 | **미수정** | 커뮤니티, 주문, 포트폴리오, 뉴스, 리더보드 인라인 탭에 `role="tab"` / `aria-selected` 없음 |
| [A11Y-M-02] Tabs role="tabpanel" 미구현 | **미수정** | 프로젝트 전체에 `role="tabpanel"` 없음 |
| [A11Y-M-03] RoomList 컨텍스트 메뉴 키보드 접근 불가 | **미수정** | `onContextMenu` 전용 유지 |
| [A11Y-M-04] SpotlightSearch aria-labelledby + 포커스 트랩 부재 | **미수정** | `SpotlightSearch.tsx:106` `useFocusTrap` 미사용, `aria-labelledby` 없음 |
| [A11Y-M-05] 관심종목 Star/Bell 버튼 aria-label 누락 | **미수정** | `asset/[symbol]/page.tsx:189-218` aria-label 없음 |
| [A11Y-L-01] CandlestickChart 지표 토글 비색상 구분 부재 | **미수정** | opacity만으로 구분 유지 |
| [A11Y-L-02] Input label htmlFor 미연결 | **미수정** | `Input.tsx:58` `htmlFor` 없음, 에러 `aria-describedby` 미연결 |
| [A11Y-L-03] BottomNav aria-current 미적용 | **미수정** | 활성 링크에 `aria-current="page"` 없음 |
| [FRM-M-01] 입금/출금 BottomSheet 닫기 시 입력값 미초기화 | **미수정** | `portfolio/page.tsx:371` `onClose`에서 금액 초기화 미호출 |
| [FRM-M-02] 주문 수정 취소 시 editPrice/editQuantity 미초기화 | **미수정** | `orders/page.tsx:634` `setEditingOrderId(null)`만 호출 |
| [FRM-M-03] 주문 수정 입력 필드 포커스 링 미적용 | **미수정** | 네이티브 input에 `focus:ring` 없음 |
| [FRM-L-01] Button focus: vs focus-visible: | **미수정** | `Button.tsx:36` `focus:ring-2` 유지 |
| [LD-M-01] AI 분석 에러 유형 미구분 | **미수정** | `setAiError(true)` 단일 처리 유지 |
| [LD-M-02] 뉴스 스켈레톤 비구조화 pulse | **미수정** | `animate-pulse` 단순 직사각형 유지 |
| [LD-L-01] 마이페이지 프로필 로딩 텍스트만 표시 | **미수정** | `{t('common.loading')}` 텍스트 유지 |
| [NAV-M-01] 종목 상세 뒤로 가기 하드코딩 | **미수정** | `href="/dashboard"` 하드코딩 유지 |
| [NAV-M-02] 뉴스 검색 활성 필터 상태 피드백 부족 | **미수정** | 결과 건수/필터 초기화 버튼 미제공 |
| [NAV-L-01] 포트폴리오 빈 상태 거래 분석 링크 부재 | **미수정** | 대시보드 링크만 제공 |
| [INF-M-01] 대시보드 AI 분석 범위 정보 미표시 | **미수정** | 모달 헤더에 부가 정보 없음 |
| [INF-M-02] 주문 확인 모달 비구조화 텍스트 | **미수정** | `\n` 연결 형태 유지 |
| [INF-L-01] 리더보드 빈 상태 구분선 불필요 표시 | **미수정** | `divide-y` 내부 배치 유지 |
| [INF-L-02] AssetList 모바일 필터 변경 시 자동 접힘 미구현 | **미수정** | `setMobileFilterOpen(false)` 미호출 유지 |
| [MOD-M-01] 뉴스 AI 분석 모달 포커스 트랩 미적용 | **미수정** | `useFocusTrap` 미사용 |
| [MOD-M-02] MarketIndexModal 포커스 트랩 미적용 | **미수정** | `useFocusTrap` 미사용 |
| [MOD-M-03] UserProfileModal 포커스 트랩 미적용 | **미수정** | `useFocusTrap` 미사용 |
| [ETC-L-01] 이미지 alt 텍스트 가이드라인 부재 | **미수정** | 가이드라인 수립 미진행 |

**요약:** 6차에서 지적된 31건 중 **0건 수정, 31건 전량 미수정**.

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 애니메이션/트랜지션 (신규) | 0 | 1 | 3 | 2 | 6 |
| B. 타이포그래피/가독성 (신규) | 0 | 0 | 2 | 3 | 5 |
| C. 사용자 경험 개선 (신규) | 0 | 0 | 3 | 2 | 5 |
| D. 모바일 반응형 (이관) | 0 | 0 | 3 | 2 | 5 |
| E. 접근성 A11Y (이관) | 0 | 0 | 5 | 3 | 8 |
| F. 폼/입력 UX (이관) | 0 | 0 | 3 | 1 | 4 |
| G. 로딩/에러 상태 (이관) | 0 | 0 | 2 | 1 | 3 |
| H. 네비게이션/흐름 (이관) | 0 | 0 | 2 | 1 | 3 |
| I. 정보 구조/표시 (이관) | 0 | 0 | 2 | 2 | 4 |
| J. 모달/다이얼로그 (이관) | 0 | 0 | 3 | 0 | 3 |
| K. 기타 (이관) | 0 | 0 | 0 | 1 | 1 |
| L. 색각 접근성 (보충 감사) | 0 | 0 | 1 | 0 | 1 |
| M. 차트 접근성 (보충 감사) | 0 | 0 | 1 | 0 | 1 |
| N. 폼 검증 UX (보충 감사) | 0 | 0 | 1 | 0 | 1 |
| O. 비동기 버튼 로딩 (보충 감사) | 0 | 0 | 1 | 0 | 1 |
| P. 404 페이지 (보충 감사) | 0 | 0 | 0 | 1 | 1 |
| Q. 테이블 정렬 (보충 감사) | 0 | 0 | 1 | 0 | 1 |
| **R. 모바일 사용성 심층 감사 (신규)** | **1** | **3** | **10** | **4** | **18** |
| **합계** | **1** | **4** | **44** | **25** | **74** |

---

## A. 애니메이션/트랜지션 — 6건 (신규 확장 범위)

### [ANI-H-01] 페이지 간 전환 애니메이션 부재 — 하드 컷
- **현상**: Next.js App Router 사용 중이나 페이지 전환 시 아무런 트랜지션이 없음. `ScrollToTop.tsx:18`에서 `window.scrollTo(0, 0)`으로 즉시 스크롤 이동하며 `behavior: 'smooth'` 미적용. 페이지 간 이동 시 콘텐츠가 즉시 교체되어 사용자가 이동했음을 인지하기 어려움. `MainContent.tsx:23`에 채팅 사이드바 margin 전환(`transition-[margin] duration-300`)은 있으나, 페이지 콘텐츠 자체의 fade/slide 전환은 없음
- **위치**: `frontend/src/components/layout/ScrollToTop.tsx:18`, `frontend/src/components/layout/MainContent.tsx:23`
- **영향**: 페이지 전환 시 하드 컷으로 인해 SPA 특유의 매끄러운 경험 부재. 특히 대시보드 → 종목 상세 → 뒤로 가기 흐름에서 콘텐츠가 즉시 교체되어 시각적 맥락 상실
- **권장**: 1) `ScrollToTop`에서 `behavior: 'smooth'` 적용, 2) `MainContent` 내부에 CSS `opacity` 기반 fade 전환 또는 `View Transitions API` 적용 (Next.js 15의 `unstable_ViewTransition` 활용 가능)
- **심각도**: High

### [ANI-M-01] Tabs 탭 전환 — 언더라인 인디케이터 점프
- **현상**: `Tabs.tsx:86-88`의 default 변형에서 활성 탭 언더라인(`<span className="absolute bottom-0 ... h-[2px] bg-accent">`)이 조건부 렌더링(`{activeTab === tab.key && ...}`)으로 처리. 탭 전환 시 이전 위치의 언더라인이 사라지고 새 위치에 즉시 나타나는 점프 현상 발생. pill 변형도 `transition-colors`만 적용되어 배경색 전환만 부드럽고 탭 선택 상태 전환은 즉시 교체
- **위치**: `frontend/src/components/ui/Tabs.tsx:86-88`
- **영향**: 업계 표준 탭 UI(Material Design, Apple HIG)에서는 언더라인이 활성 탭으로 슬라이드하는 것이 관행. 현재 구현은 시각적 연속성 부족
- **권장**: CSS `transform: translateX()` + `transition-transform` 기반 슬라이딩 언더라인 구현, 또는 `layoutId` 패턴 없이 `left`/`width` 값을 ref로 계산하여 전환
- **심각도**: Medium

### [ANI-M-02] 리스트 아이템 로딩 — 스태거 애니메이션 부재
- **현상**: `AssetListSkeleton`(`Skeleton.tsx:32-56`)에서 10개 행이 동시에 `animate-pulse` 적용. 데이터 로딩 완료 후 실제 아이템도 즉시 전체 표시. 리더보드(`leaderboard/page.tsx`), 공지사항(`announcements/page.tsx`), 뉴스(`news/page.tsx`), 커뮤니티 게시판 등 모든 리스트에서 동일한 패턴. `stagger` 또는 `animation-delay` 기반 순차 등장 효과가 프로젝트 전체에서 사용되지 않음
- **위치**: 프로젝트 전체 리스트 컴포넌트 (`Skeleton.tsx`, `AssetList.tsx`, `leaderboard/page.tsx`, `announcements/page.tsx`, `news/page.tsx`)
- **영향**: 대량의 리스트 아이템이 한꺼번에 나타나 시각적 부담 증가, 콘텐츠 계층 구조 인식 어려움
- **권장**: 리스트 아이템에 `animation-delay: calc(index * 50ms)` 기반 스태거 fade-in 적용. `prefers-reduced-motion: reduce` 미디어 쿼리에서 비활성화
- **심각도**: Medium

### [ANI-M-03] 스켈레톤 → 실제 콘텐츠 전환 — 즉시 교체 (하드 스왑)
- **현상**: `AssetListSkeleton` → 실제 `AssetList` 교체 시 스켈레톤이 사라지고 실제 콘텐츠가 즉시 나타남. fade-out/fade-in 크로스페이드 효과 없이 하드 스왑. 종목 상세 차트 로딩(`ChartSkeleton` → `CandlestickChart`), 호가창(`OrderBookSkeleton` → `OrderBook`), 체결내역(`TradesSkeleton` → trades list) 모두 동일
- **위치**: `frontend/src/components/ui/Skeleton.tsx` 사용처 전체, `frontend/src/app/(main)/asset/[symbol]/page.tsx`, `frontend/src/app/(main)/dashboard/page.tsx`
- **영향**: 스켈레톤에서 실제 콘텐츠로의 전환이 갑작스러워 CLS(Cumulative Layout Shift)와 유사한 시각적 불안정
- **권장**: 실제 콘텐츠에 `animate-fade-in` (opacity 0→1, 300ms) 적용하여 부드러운 등장 효과 제공
- **심각도**: Medium

### [ANI-L-01] 드롭다운 메뉴 닫힘 — 애니메이션 부재
- **현상**: 헤더 사용자 메뉴(`Header.tsx:256`), 주문 StatusDropdown(`orders/page.tsx:70`), AssetList 모바일 필터 등 드롭다운이 열릴 때 `animate-dropdown-in`(scale 0.95→1, opacity 0→1, 250ms)으로 애니메이션되지만, 닫힐 때는 조건부 렌더링(`{open && ...}`)으로 즉시 사라짐. 열림/닫힘 비대칭
- **위치**: `frontend/src/components/layout/Header.tsx:256`, `frontend/src/app/(main)/orders/page.tsx:70`, `frontend/src/components/market/AssetList.tsx`
- **영향**: 드롭다운 닫힘이 갑작스러워 사용자가 메뉴 상태 변화를 놓칠 수 있음
- **권장**: 닫힘 시 `animate-dropdown-out` (opacity 1→0, scale 1→0.97, 150ms) 적용 후 `onAnimationEnd`에서 언마운트, 또는 `display: none`을 `setTimeout`으로 지연
- **심각도**: Low

### [ANI-L-02] 모달 닫힘 — 애니메이션 부재
- **현상**: `ConfirmModal.tsx`, `ContentModal.tsx`, `BottomSheet.tsx`, `DashboardAiModal.tsx` 등 모든 모달이 열릴 때 `animate-modal-backdrop`(fade) + `animate-modal-content`(scale+slide) 애니메이션 적용. 그러나 닫힐 때는 `if (!isOpen) return null`로 즉시 언마운트되어 애니메이션 없이 사라짐. 열림/닫힘 비대칭
- **위치**: `frontend/src/components/ui/ConfirmModal.tsx:53`, `frontend/src/components/ui/ContentModal.tsx:55`, `frontend/src/components/ui/BottomSheet.tsx:53`, `frontend/src/components/dashboard/DashboardAiModal.tsx`
- **영향**: 모달이 갑자기 사라져 사용자가 모달의 결과(확인/취소)를 인지하기 전에 콘텐츠가 노출됨
- **권장**: 닫힘 시 역방향 애니메이션(scale 1→0.97, opacity 1→0, 200ms) 적용 후 `onAnimationEnd`에서 `return null` 처리. `isOpen` 외에 `isClosing` 상태 추가
- **심각도**: Low

---

## B. 타이포그래피/가독성 — 5건 (신규 확장 범위)

### [TYP-M-01] 본문(body) line-height 미설정 — 기본 1.0 가독성 저하 우려
- **현상**: `globals.css:61-64`에서 `body`의 `font-family`와 `letter-spacing: -0.02em`만 설정하고, `line-height`를 명시하지 않음. Tailwind의 기본 `line-height`는 `normal`(약 1.2)로 본문 텍스트의 가독성 최적 범위(1.5~1.7)에 미달. 마크다운 콘텐츠에서는 `line-height: 1.7`이 적용되나(`globals.css:237`), 일반 페이지 텍스트에는 미적용. 다만 대부분의 컴포넌트에서 Tailwind의 `text-[14px]` 등과 함께 `leading-relaxed`를 사용하는 곳이 랜딩 페이지 등 일부에 한정됨
- **위치**: `frontend/src/app/globals.css:61-64`, 프로젝트 전체 페이지
- **영향**: 한글 텍스트에서 특히 줄 간격이 좁아 장문 설명 텍스트의 가독성 저하. 뉴스 페이지, 공지사항 상세, 도움말 페이지 등 본문 콘텐츠가 많은 곳에서 영향
- **권장**: `body`에 `line-height: 1.6` 또는 Tailwind의 `leading-relaxed` 기본값 적용
- **심각도**: Medium

### [TYP-M-02] 헤더 네비게이션 폰트 크기 — desktop `text-[13px]` 가독성 부족
- **현상**: `Header.tsx:118-131`의 데스크톱 네비게이션 링크가 `text-[13px] xl:text-[14px]`으로 설정. 1120px~1280px 범위에서 13px 폰트가 Pretendard Variable의 `font-weight: 500`과 결합되어 고해상도 디스플레이에서는 적절하나, 96dpi 일반 모니터에서 가독성 부족 가능. 8개 이상의 메뉴 아이템이 좁은 간격(`gap-4 xl:gap-6`)에 배치
- **위치**: `frontend/src/components/layout/Header.tsx:118-131`
- **영향**: 네비게이션 메뉴가 밀집되어 터치가 아닌 클릭 시에도 오선택 가능
- **권장**: 최소 `text-[14px]`로 상향, 또는 `nav` 브레이크포인트(1120px) 이하에서 아이콘+텍스트 조합으로 식별성 향상
- **심각도**: Medium

### [TYP-L-01] 금융 데이터 폰트 — 시스템 기본 폰트 의존
- **현상**: 가격/수량/거래대금 등 금융 데이터에 `tabular-nums`(고정폭 숫자, `font-variant-numeric: tabular-nums`)가 광범위하게 적용됨 (38개 파일, 178회 사용). 그러나 Pretendard Variable 폰트의 `tabular-nums` 지원이 완전하지 않을 수 있으며, 별도의 모노스페이스 폰트(`SF Mono`, `Fira Code` 등)는 마크다운 `code` 블록에서만 사용. 오더북(`OrderBook.tsx`)과 체결내역에서 가격 자릿수 정렬이 Pretendard의 `tabular-nums`에 의존
- **위치**: `frontend/src/components/trading/OrderBook.tsx`, `frontend/src/components/market/AssetListItem.tsx`, `frontend/src/components/portfolio/BalanceCard.tsx` 등 38개 파일
- **영향**: 브라우저/OS별 Pretendard의 `tabular-nums` 렌더링 차이로 숫자 정렬 불일관 가능. 현재 구현이 대부분의 환경에서 동작하지만, 폴백 시 시스템 sans-serif의 proportional-nums로 렌더링될 수 있음
- **권장**: 금융 데이터 전용 폰트(예: `JetBrains Mono` 또는 `SF Mono`)를 `code, .financial-number` 클래스에 적용하거나, Pretendard의 `tabular-nums` 동작을 주요 브라우저에서 검증
- **심각도**: Low

### [TYP-L-02] 텍스트 크기 계층 — h1~h3 일관성 부족
- **현상**: 랜딩 페이지에서 `h1: text-[36px] md:text-[52px]`, `h2: text-[22px] md:text-[28px]`으로 명확한 계층 구조 존재. 그러나 대시보드, 포트폴리오, 주문 등 내부 페이지에서는 `<h1>` 태그 사용 없이 `text-[18px] font-bold` ~ `text-[22px] font-bold` 범위의 제목이 `<div>` 또는 `<span>`으로 렌더링. 시맨틱 헤딩 태그(`h1`~`h3`) 사용이 일관되지 않음
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx`, `frontend/src/app/(main)/orders/page.tsx`, `frontend/src/app/(main)/leaderboard/page.tsx`, `frontend/src/app/(main)/news/page.tsx`
- **영향**: 스크린 리더가 페이지 제목을 인식하지 못하며, 시각적으로도 페이지 간 제목 크기 차이로 일관성 부족
- **권장**: 각 페이지 최상단에 `<h1>` 태그 사용, 섹션 제목에 `<h2>`, 하위 섹션에 `<h3>` 적용
- **심각도**: Low

### [TYP-L-03] BottomNav 라벨 — text-[11px] 최소 가독성 경계
- **현상**: `BottomNav.tsx:35`의 네비게이션 라벨이 `text-[11px] font-semibold`로 설정. iOS 접근성 가이드라인에서 권장하는 최소 텍스트 크기는 11pt(약 14.67px)이며, Android Material Design에서는 12sp(약 12px). 현재 11px은 두 플랫폼 모두에서 최소 기준 미달. Pretendard Variable의 `font-weight: 600`으로 보완되지만, 저해상도 디스플레이에서 가독성 저하
- **위치**: `frontend/src/components/layout/BottomNav.tsx:35, 49, 59, 71, 86, 97, 108`
- **영향**: 모바일에서 네비게이션 라벨을 읽기 어려운 사용자 존재 가능
- **권장**: `text-[12px]`로 상향하거나, 아이콘 크기를 24px로 확대하여 라벨 의존도 감소
- **심각도**: Low

---

## C. 사용자 경험 개선 — 5건 (신규 확장 범위)

### [UX-M-01] 첫 방문 사용자 경험 — 온보딩 안내 부재
- **현상**: 회원가입 후 또는 비로그인 상태에서 대시보드에 진입하면 종목 목록이 바로 표시되지만, 각 기능(관심종목 추가, 스포트라이트 검색 `/` 키, AI 분석, 포트폴리오 등)에 대한 안내가 없음. 도움말 페이지(`/help`)가 상세하게 구성되어 있으나, 최초 방문 시 자동 안내나 툴팁이 없어 기능 발견성(discoverability) 부족. 스포트라이트 검색은 `/` 키 바인딩이 있으나 데스크톱 헤더의 `kbd` 태그로만 힌트 제공
- **위치**: 프로젝트 전체
- **영향**: 신규 사용자가 고급 기능을 발견하지 못하고 기본 기능만 사용
- **권장**: 1) 최초 로그인 시 3~5단계의 인터랙티브 투어(spotlight 검색, AI 분석, 관심종목 등), 2) 또는 각 기능 영역에 `?` 아이콘 → 토스트 형태의 인라인 힌트 제공
- **심각도**: Medium

### [UX-M-02] 데이터 갱신 시각 — 전역 "마지막 업데이트" 표시 부재
- **현상**: `RefreshControl.tsx`가 경과 시간("N초 전")과 자동 갱신 주기를 표시하지만, 이 컴포넌트는 포트폴리오, 주문, 리더보드 등 일부 페이지에서만 사용. 대시보드의 실시간 가격은 WebSocket으로 업데이트되지만 마지막 수신 시각이 UI에 표시되지 않음. 사용자가 데이터의 실시간성을 판단할 수 없음
- **위치**: `frontend/src/app/(main)/dashboard/page.tsx`, WebSocket 연결 상태 표시 전체
- **영향**: 네트워크 문제로 WebSocket이 끊겼을 때 사용자가 오래된 데이터를 실시간으로 오인
- **권장**: 헤더 또는 대시보드 상단에 WebSocket 연결 상태 인디케이터(초록 점 = 연결, 빨간 점 = 끊김) 및 마지막 수신 시각 표시
- **심각도**: Medium

### [UX-M-03] 키보드 단축키 — 발견성 부족 및 도움말 미제공
- **현상**: 현재 구현된 키보드 단축키: `/`(스포트라이트 검색, 대시보드에서만), `ESC`(모달/패널 닫기). 주문 페이지, 포트폴리오 등 다른 페이지에서는 키보드 단축키 미구현. 글로벌 `?` 키 → 단축키 목록 모달 같은 발견 수단 없음. `SpotlightSearch`의 하단에 `↑↓ 탐색, Enter 선택, ESC 닫기` 힌트는 있으나, 다른 페이지에서는 단축키 정보 미제공
- **위치**: `frontend/src/app/(main)/dashboard/page.tsx:93-100`, `frontend/src/components/market/SpotlightSearch.tsx:192-205`
- **영향**: 파워 유저가 효율적으로 사용할 수 있는 단축키가 제한적이며, 기존 단축키도 발견하기 어려움
- **권장**: 1) `?` 키 → 글로벌 단축키 목록 모달, 2) 포트폴리오 `D`(입금), `W`(출금), 주문 `B`(매수), `S`(매도) 등 도메인 단축키 추가
- **심각도**: Medium

### [UX-L-01] 스크롤 위치 보존 — 뒤로 가기 시 미유지
- **현상**: `ScrollToTop.tsx:18`에서 `pathname` 변경 시 항상 `window.scrollTo(0, 0)` 실행. 리더보드에서 50번째 사용자를 확인하고 프로필 모달을 닫은 후 다른 페이지 이동 → 뒤로 가기 시 스크롤이 최상단으로 리셋. 대시보드에서 종목 100개 중 80번째를 보다가 종목 상세 진입 → 뒤로 가기 시에도 최상단으로 리셋
- **위치**: `frontend/src/components/layout/ScrollToTop.tsx:18`
- **영향**: 긴 리스트를 탐색하던 사용자가 이전 위치를 잃어 재탐색 필요
- **권장**: `ScrollToTop`에서 `popstate` 이벤트(뒤로/앞으로 가기)를 감지하여 스크롤 초기화 건너뛰기, 또는 Next.js의 `experimental.scrollRestoration: true` 활용
- **심각도**: Low

### [UX-L-02] 반응형 브레이크포인트 전환 — 불연속 레이아웃 점프
- **현상**: 주요 브레이크포인트(sm: 640px, lg: 1024px, nav: 1120px)에서 레이아웃이 즉시 변경됨. 예: BottomNav는 `lg:hidden`으로 1024px에서 즉시 사라지고, 헤더 데스크톱 네비게이션은 `nav:flex`(1120px)에서 즉시 나타남. 1024px~1120px 범위에서 BottomNav가 사라졌는데 헤더 네비게이션은 아직 나타나지 않는 96px 갭 구간이 존재
- **위치**: `frontend/src/components/layout/BottomNav.tsx:23` (`lg:hidden`), `frontend/src/components/layout/Header.tsx:114` (`nav:flex`)
- **영향**: 태블릿(1024px~1120px) 사용 시 하단 네비게이션도 상단 전체 네비게이션도 없는 구간 발생, 모바일 햄버거 메뉴로만 탐색 가능
- **권장**: `BottomNav`의 `lg:hidden`을 `nav:hidden`으로 변경하여 1120px 기준으로 통일하거나, 중간 구간에서 축약된 네비게이션 제공
- **심각도**: Low

---

## D. 모바일 반응형 — 5건 (6차 이관)

### [RD-M-01] OrderForm — 모바일 전용 높이/패딩 미적용 (5차 이후 변동 없음)
- **현상**: `OrderForm.tsx:247-404`에서 가격/수량 Input(`h-12`)과 주문 버튼(`h-[52px]`)에 모바일 전용 클래스 없음. 320px에서 `space-y-4` 간격만으로 폼 요소 밀집
- **위치**: `frontend/src/components/trading/OrderForm.tsx:247-404`
- **영향**: 320px에서 터치 타겟 간 여백 부족으로 오탭 가능
- **권장**: 모바일에서 `space-y-5` 이상 적용, Input 높이 48px+ 확대
- **심각도**: Medium

### [RD-M-02] 종목 상세 — safe-bottom + pb-8 중복 (4차 이후 변동 없음)
- **현상**: `asset/[symbol]/page.tsx:520`에 `safe-bottom px-4 py-3 pb-8` 유지. `safe-bottom`과 `pb-8` 중복으로 iPhone 노치 기기에서 과도한 하단 여백
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:520`
- **영향**: 일부 기기에서 매수/매도 버튼 위치 비정상
- **권장**: `safe-bottom` 적용 시 `pb-8` 제거
- **심각도**: Medium

### [RD-M-03] 주문 분석 탭 — 시간대별 분포 바 차트 320px 가독성 저하 (5차 이후 변동 없음)
- **현상**: `orders/page.tsx:261-300`의 24시간 바 차트가 320px에서 각 약 10px 너비, `text-[9px]`/`text-[10px]` 라벨 겹침
- **위치**: `frontend/src/app/(main)/orders/page.tsx:261-300`
- **영향**: 320px에서 시간대별 차트 정보 전달 불가
- **권장**: 모바일에서 12시간 단위 그룹핑 또는 가로 스크롤 적용
- **심각도**: Medium

### [RD-L-01] 포트폴리오 Market Pulse — 단일 열 그리드 (4차 이후 변동 없음)
- **현상**: `portfolio/page.tsx:233`의 Market Pulse `grid-cols-1 sm:grid-cols-2`. 보유 종목 10개+ 시 모바일에서 과도한 세로 스크롤
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:233`
- **영향**: 다수 보유 종목 시 모바일에서 과도한 세로 스크롤
- **권장**: 모바일 컴팩트 레이아웃 적용
- **심각도**: Low

### [RD-L-02] 뉴스 AI 분석 버튼 — 320px 넘침 (5차 이후 변동 없음)
- **현상**: `news/page.tsx:222-260`에서 AI 분석 버튼(`min-w-[120px]`)과 3개 카테고리 탭이 320px에서 넘침
- **위치**: `frontend/src/app/(main)/news/page.tsx:222-260`
- **영향**: 320px에서 AI 분석 버튼 또는 카테고리 탭 잘림
- **권장**: AI 버튼을 모바일에서 아이콘만 표시하거나 별도 행 배치
- **심각도**: Low

---

## E. 접근성 (A11Y) — 8건 (6차 이관)

### [A11Y-M-01] 인라인 탭 ARIA — 5개 페이지 미적용 (5차 부분 수정 이후 변동 없음)
- **현상**: 커뮤니티, 주문, 포트폴리오, 뉴스, 리더보드 페이지의 인라인 탭에 `role="tablist"` / `role="tab"` / `aria-selected` 미적용
- **위치**: 커뮤니티, 주문, 포트폴리오, 뉴스, 리더보드 각 페이지 탭 영역
- **영향**: WCAG 2.1 4.1.2 위반
- **권장**: `Tabs` 공통 컴포넌트로 교체 또는 직접 ARIA 속성 추가
- **심각도**: Medium

### [A11Y-M-02] Tabs role="tabpanel" 미구현 (6차 신규, 변동 없음)
- **현상**: `Tabs.tsx`에 `tablist`/`tab`은 있으나 `tabpanel` 연결 없음
- **위치**: `frontend/src/components/ui/Tabs.tsx` 및 사용처
- **영향**: 스크린 리더가 탭-패널 관계 파악 불가
- **권장**: `role="tabpanel" aria-labelledby="tab-{key}"` 적용
- **심각도**: Medium

### [A11Y-M-03] RoomList 컨텍스트 메뉴 — 키보드 접근 불가 (4차 이후 변동 없음)
- **현상**: `RoomList.tsx:226` `onContextMenu`로만 열림
- **위치**: `frontend/src/components/chat/RoomList.tsx:226`
- **영향**: 키보드/터치 사용자 채팅방 관리 기능 접근 차단
- **권장**: 더보기 아이콘 버튼 또는 Shift+F10 지원
- **심각도**: Medium

### [A11Y-M-04] SpotlightSearch — aria-labelledby 및 포커스 트랩 부재 (5차 이후 변동 없음)
- **현상**: `SpotlightSearch.tsx:106`에 `aria-labelledby` 없고 `useFocusTrap` 미적용
- **위치**: `frontend/src/components/market/SpotlightSearch.tsx:106`
- **영향**: WCAG 2.1 2.4.3 위반
- **권장**: `aria-labelledby` + `useFocusTrap` 적용
- **심각도**: Medium

### [A11Y-M-05] 관심종목 Star/Bell 버튼 aria-label 누락 (5차 이후 변동 없음, 3회 연속 미수정)
- **현상**: `asset/[symbol]/page.tsx:189-218`의 Star/Bell 버튼에 aria-label 없음
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:189-218`
- **영향**: 스크린 리더 사용자 버튼 용도 인식 불가
- **권장**: Star에 `aria-label={isWatchlisted ? '관심종목 제거' : '관심종목 추가'}`, Bell에 `aria-label="가격 알림 설정"` 추가
- **심각도**: Medium (3회 연속 미수정)

### [A11Y-L-01] CandlestickChart 지표 토글 — 비색상 구분 부재 (4차 이후 변동 없음)
- **현상**: opacity(1 vs 0.35)만으로 활성/비활성 구분
- **위치**: `frontend/src/components/chart/CandlestickChart.tsx:530`
- **영향**: 색각 이상 사용자 지표 상태 인식 어려움
- **권장**: 체크마크 아이콘 또는 테두리 두께 변화 추가
- **심각도**: Low

### [A11Y-L-02] Input label htmlFor 미연결 (6차 신규, 변동 없음)
- **현상**: `Input.tsx:58`에서 `<label>` 에 `htmlFor` 없음, 에러 메시지 `aria-describedby` 미연결
- **위치**: `frontend/src/components/ui/Input.tsx:58, 62, 75`
- **영향**: label-input 프로그래밍적 연결 불완전
- **권장**: `useId()`로 고유 ID 생성, `htmlFor`/`aria-describedby` 연결
- **심각도**: Low

### [A11Y-L-03] BottomNav aria-current 미적용 (6차 신규, 변동 없음)
- **현상**: 활성 링크에 `aria-current="page"` 없음
- **위치**: `frontend/src/components/layout/BottomNav.tsx:23-111`
- **영향**: 스크린 리더 사용자 현재 탭 인식 불가
- **권장**: 활성 링크에 `aria-current="page"` 추가
- **심각도**: Low

---

## F. 폼/입력 UX — 4건 (6차 이관)

### [FRM-M-01] 입금/출금 BottomSheet — 닫기 시 입력값 미초기화 (4차 이후 변동 없음)
- **현상**: `portfolio/page.tsx:371` BottomSheet 닫기 시 금액 상태 초기화 미호출
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:371, 425`
- **영향**: 이전 입력값 잔존으로 사용자 혼란
- **권장**: `onClose`에서 `setDepositAmount('')` / `setWithdrawAmount('')` 호출
- **심각도**: Medium

### [FRM-M-02] 주문 수정 취소 시 editPrice/editQuantity 미초기화 (4차 이후 변동 없음)
- **현상**: `orders/page.tsx:634`에서 `setEditingOrderId(null)`만 호출
- **위치**: `frontend/src/app/(main)/orders/page.tsx:634`
- **영향**: 재수정 시 이전 입력값이 초기값으로 표시
- **권장**: 취소 시 `setEditPrice('')`/`setEditQuantity('')` 동시 호출
- **심각도**: Medium

### [FRM-M-03] 주문 수정 입력 필드 — 포커스 링 및 접근성 미적용 (5차 이후 변동 없음, 3회 연속 미수정)
- **현상**: `orders/page.tsx:610-622` inline input에 `focus:ring` 없고 `aria-label` 없음
- **위치**: `frontend/src/app/(main)/orders/page.tsx:610-622`
- **영향**: 디자인 시스템 불일관, 접근성 미흡
- **권장**: Input 컴포넌트 사용 또는 동일 포커스/접근성 클래스 적용
- **심각도**: Medium (3회 연속 미수정)

### [FRM-L-01] Button/Input focus: vs focus-visible: (6차 신규, 변동 없음)
- **현상**: `Button.tsx:36`에서 `focus:ring-2` 사용 (마우스 클릭 시에도 표시). `globals.css:157-170`에서 `:focus-visible` 전역 outline이 별도 정의되어 이중 포커스 스타일 발생 가능
- **위치**: `frontend/src/components/ui/Button.tsx:36`, `frontend/src/components/ui/Input.tsx:67`
- **영향**: 마우스 클릭 시 불필요한 포커스 링, 키보드 시 이중 outline
- **권장**: `focus:ring-2` → `focus-visible:ring-2` 변경
- **심각도**: Low

---

## G. 로딩/에러 상태 — 3건 (6차 이관)

### [LD-M-01] AI 분석 에러 유형 미구분 (4차 이후 변동 없음)
- **현상**: 모든 에러를 `setAiError(true)` 단일 처리
- **위치**: `frontend/src/app/(main)/dashboard/page.tsx:185`, `frontend/src/app/(main)/news/page.tsx:189`
- **영향**: 재시도 가능 여부 판단 불가
- **권장**: 에러 유형별 메시지 분기
- **심각도**: Medium

### [LD-M-02] 뉴스 페이지 — 비구조화 pulse 로딩 (5차 이후 변동 없음)
- **현상**: `news/page.tsx:289`에서 단순 `animate-pulse` 직사각형만 표시
- **위치**: `frontend/src/app/(main)/news/page.tsx:289`
- **영향**: 뉴스 카드 구조 반영하지 않는 로딩 표시, CLS 증가
- **권장**: 뉴스 카드 구조 스켈레톤 적용
- **심각도**: Medium

### [LD-L-01] 마이페이지 — 프로필 로딩 시 텍스트만 표시 (5차 이후 변동 없음)
- **현상**: `mypage/page.tsx:296-298`에서 `{t('common.loading')}` 텍스트만 표시
- **위치**: `frontend/src/app/(main)/mypage/page.tsx:296-298`
- **영향**: 빈 화면에 텍스트만 표시, CLS 발생
- **권장**: 카드 그리드 스켈레톤 적용
- **심각도**: Low

---

## H. 네비게이션/흐름 — 3건 (6차 이관)

### [NAV-M-01] 종목 상세 뒤로 가기 — 하드코딩 경로 (4차 이후 변동 없음)
- **현상**: `asset/[symbol]/page.tsx:181`의 뒤로 가기가 `href="/dashboard"` 하드코딩
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:181`
- **영향**: 다양한 진입 경로에서 항상 대시보드로 복귀, 흐름 단절
- **권장**: `router.back()` 또는 referrer 경로 저장
- **심각도**: Medium

### [NAV-M-02] 뉴스 검색 — 활성 필터 피드백 부족 (4차 이후 변동 없음)
- **현상**: 검색어와 날짜 필터 동시 적용 시 결과 건수/필터 초기화 버튼 없음
- **위치**: `frontend/src/app/(main)/news/page.tsx:56, 121-132`
- **영향**: 사용자가 필터 상태를 인지하지 못함
- **권장**: 활성 필터 뱃지, "N건 결과" 카운터, 전체 초기화 버튼 제공
- **심각도**: Medium

### [NAV-L-01] 포트폴리오 빈 상태 — 거래 분석 링크 부재 (4차 이후 변동 없음)
- **현상**: 보유 종목 0인 경우 대시보드 링크만 제공
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:332-344`
- **영향**: 전량 매도 후 거래 기록 확인 시 별도 탭 전환 필요
- **권장**: "거래 분석 보기" 링크 추가
- **심각도**: Low

---

## I. 정보 구조/표시 — 4건 (6차 이관)

### [INF-M-01] 대시보드 AI 분석 — 범위 정보 미표시 (4차 이후 변동 없음)
- **현상**: AI 분석 모달에 분석 범위/시점 정보 없음
- **위치**: `frontend/src/components/dashboard/DashboardAiModal.tsx`
- **영향**: 분석 신뢰도 판단 어려움
- **권장**: "최근 24시간 / N건 뉴스 기반" 부가 정보 표시
- **심각도**: Medium

### [INF-M-02] 주문 확인 모달 — 비구조화 텍스트 (4차 이후 변동 없음)
- **현상**: `OrderForm.tsx:400`에서 `\n` 문자열 연결로 주문 정보 나열
- **위치**: `frontend/src/components/trading/OrderForm.tsx:400`
- **영향**: 주문 확인 단계에서 핵심 정보 파악 어려움, 오주문 위험
- **권장**: 구조화된 label-value 레이아웃 적용
- **심각도**: Medium

### [INF-L-01] 리더보드 빈 상태 — 구분선 불필요 표시 (4차 이후 변동 없음)
- **현상**: 빈 상태 메시지가 `divide-y` 목록 내부에 위치
- **위치**: `frontend/src/app/(main)/leaderboard/page.tsx:470, 620`
- **영향**: 시각적 비일관성
- **권장**: 빈 상태를 목록 div 외부로 이동
- **심각도**: Low

### [INF-L-02] AssetList 모바일 필터 — 변경 시 자동 접힘 미구현 (4차 이후 변동 없음)
- **현상**: 필터 변경 후 드롭다운이 접히지 않음
- **위치**: `frontend/src/components/market/AssetList.tsx`
- **영향**: 모바일에서 필터가 화면 공간 계속 차지
- **권장**: 필터 변경 핸들러에서 `setMobileFilterOpen(false)` 호출
- **심각도**: Low

---

## J. 모달/다이얼로그 — 3건 (6차 이관)

### [MOD-M-01] 뉴스 AI 분석 모달 — 포커스 트랩 미적용 (5차 이후 변동 없음)
- **현상**: `news/page.tsx:357`에 `useFocusTrap` 미적용. 대시보드 AI 모달에는 적용되어 불일관
- **위치**: `frontend/src/app/(main)/news/page.tsx:357`
- **영향**: Tab 키로 모달 외부 이탈 가능
- **권장**: `useFocusTrap` 패턴을 대시보드 AI 모달과 동일하게 적용
- **심각도**: Medium

### [MOD-M-02] MarketIndexModal — 포커스 트랩 미적용 (6차 신규, 변동 없음)
- **현상**: `MarketIndexModal.tsx:175-177`에 `useFocusTrap` 미사용
- **위치**: `frontend/src/components/market/MarketIndexModal.tsx:175-177`
- **영향**: 키보드 포커스 외부 이탈
- **권장**: `useFocusTrap` 적용
- **심각도**: Medium

### [MOD-M-03] UserProfileModal — 포커스 트랩 미적용 (5차 이후 변동 없음)
- **현상**: `UserProfileModal.tsx:119-121`에 `useFocusTrap` 미적용
- **위치**: `frontend/src/components/leaderboard/UserProfileModal.tsx:119-121`
- **영향**: 키보드 포커스 트랩 부재
- **권장**: `useFocusTrap` 적용
- **심각도**: Medium

---

## K. 기타 — 1건 (6차 이관)

### [ETC-L-01] 이미지 alt 텍스트 가이드라인 부재 (5차 이후 변동 없음)
- **현상**: 현재 img 태그 모두 적절한 alt 적용, 가이드라인 미수립
- **위치**: `frontend/src/app/page.tsx`, `frontend/src/components/layout/Footer.tsx`
- **영향**: 향후 이미지 기능 추가 시 접근성 위반 가능
- **권장**: 이미지 업로드 기능 추가 시 alt 텍스트 입력 필드 포함 가이드라인 수립
- **심각도**: Low

---

## L. 색각 접근성 — 1건 (보충 감사 신규)

### [CB-M-01] 상승/하락 색상 구분 — 색상만 사용, 비색상 보조 지표 부재 (보충 감사 신규)

- **현상**: 프로젝트 전반에서 가격 상승(`text-rise`, 빨강)과 하락(`text-fall`, 파랑)을 색상만으로 구분함. 주요 영향 영역: (1) `OrderBook.tsx:369,426`에서 호가 매도(fall)/매수(rise) 가격을 색상만으로 구분, (2) `AssetListItem.tsx:130-154`에서 종목 가격 변동률을 `text-rise`/`text-fall`로만 표시, (3) `BalanceCard.tsx:136-144,251-267`에서 손익 금액/비율을 색상만으로 구분, (4) `leaderboard/page.tsx:547-562`에서 수익률을 `text-rise`/`text-fall`로만 표시. 이미 알려진 `A11Y-L-01`(차트 지표 토글)은 opacity 구분 이슈이지만, 본 건은 데이터 자체의 의미 전달에서 색상 의존도를 다룸. `RankChangeIndicator`(97-121줄)에서는 `▲`/`▼` 기호를 색상과 함께 사용하여 올바른 패턴을 보임
- **위치**: `frontend/src/components/trading/OrderBook.tsx`, `frontend/src/components/market/AssetListItem.tsx`, `frontend/src/components/portfolio/BalanceCard.tsx`, `frontend/src/app/(main)/leaderboard/page.tsx`
- **영향**: 적록색맹(전체 남성의 약 8%) 사용자가 상승/하락을 구분하기 어려움. 한국 증시 관행(빨강=상승, 파랑=하락)이 적용되어 있으나, 색각 이상 사용자에게는 `+`/`-` 부호만이 유일한 구분 수단
- **권장**: 양수에 `▲` 또는 `+` 접두사, 음수에 `▼` 또는 `-` 접두사를 색상과 함께 표시. 또는 상승 시 `bg-rise/10` 배경 + 상향 화살표 아이콘 조합으로 시각적 이중 부호화(dual encoding) 적용
- **심각도**: Medium

---

## M. 차트 접근성 — 1건 (보충 감사 신규)

### [CHART-M-01] CandlestickChart — 스크린 리더 접근성 부재 (보충 감사 신규)

- **현상**: `CandlestickChart.tsx:538`에서 차트 컨테이너가 `<div ref={chartContainerRef} className="w-full overflow-hidden" />`로만 선언되어 있고, `role`, `aria-label`, `aria-describedby` 등 접근성 속성이 없음. RSI 차트(`rsiContainerRef`)도 동일. lightweight-charts 라이브러리가 생성하는 `<canvas>` 요소에도 대체 텍스트가 없음. 스크린 리더 사용자가 현재 가격, 변동률, 차트 기간 등의 정보를 차트에서 읽을 수 없음
- **위치**: `frontend/src/components/chart/CandlestickChart.tsx:538,541-544`
- **영향**: 시각 장애 사용자가 가격 차트의 핵심 정보(현재가, 고가/저가, 변동 추세)에 접근 불가. WCAG 2.1 1.1.1(비텍스트 콘텐츠) 위반
- **권장**: 차트 컨테이너에 `role="img" aria-label="[심볼] 캔들스틱 차트. 현재가 [price], [변동%]"` 추가. 또는 차트 하단에 `sr-only` 클래스로 텍스트 요약 제공 (현재가, 기간 고/저, 변동률 등)
- **심각도**: Medium

---

## N. 폼 검증 UX — 1건 (보충 감사 신규)

### [FVAL-M-01] OrderForm 주문 폼 — 필드별 인라인 에러 미표시 (보충 감사 신규)

- **현상**: `OrderForm.tsx`에서 주문 실패 시 에러가 `ConfirmModal`(확인 모달) 또는 토스트를 통해 표시되며, 입력 필드(가격, 수량) 옆에 인라인 에러 메시지가 표시되지 않음. 반면 회원가입 페이지(`register/page.tsx:180-318`)에서는 각 필드마다 `error` prop을 통해 인라인 에러 메시지가 표시됨 (`Input` 컴포넌트의 `error` prop 활용). 로그인 페이지에서도 단일 `error` 상태를 폼 상단에 표시하지만, 어떤 필드가 잘못되었는지 구분 없음. OrderForm에서 잔액 부족, 최소 수량 미달, 가격 범위 초과 등의 에러가 발생해도 사용자가 어느 필드를 수정해야 하는지 직관적으로 알기 어려움
- **위치**: `frontend/src/components/trading/OrderForm.tsx:247-404`
- **영향**: 주문 실패 시 사용자가 에러 원인 필드를 식별하기 어려움. 특히 모바일에서 토스트 알림이 빨리 사라지면 에러 내용을 놓칠 수 있음
- **권장**: 잔액 부족 시 수량 필드에 인라인 에러, 가격 범위 초과 시 가격 필드에 인라인 에러 표시. `Input` 컴포넌트의 기존 `error` prop 활용
- **심각도**: Medium

---

## O. 비동기 버튼 로딩 — 1건 (보충 감사 신규)

### [ASYNC-M-01] 리더보드 팔로우/카피트레이드 버튼 — isPending 로딩 상태 미표시 (보충 감사 신규)

- **현상**: `leaderboard/page.tsx:575-609`에서 `toggleFollow(entry.id)` 및 카피트레이드 버튼에 `followTrader.isPending`, `unfollowTrader.isPending` 로딩 상태가 표시되지 않음. 버튼 클릭 후 서버 응답까지 UI 피드백 없이 아이콘만 표시. 다른 페이지에서는 비동기 버튼에 `isPending` 상태를 적절히 사용: `OrderForm`(`placeOrder.isPending`), `portfolio/page.tsx`(`deposit.isPending`, `withdraw.isPending`), `mypage/page.tsx`(`resetAccount.isPending`, `changePassword.isPending`), `community/new/page.tsx`(`createPost.isPending`)
- **위치**: `frontend/src/app/(main)/leaderboard/page.tsx:575-609`
- **영향**: 네트워크 지연 시 사용자가 클릭이 인식되었는지 확인할 수 없음. 중복 클릭으로 이어질 수 있음
- **권장**: 팔로우/언팔로우 처리 중 해당 행의 버튼에 `disabled` + 스피너 또는 `opacity-50` 적용. `followTrader.isPending`과 `followTrader.variables`(현재 처리 중인 userId)를 비교하여 해당 행만 로딩 표시
- **심각도**: Medium

---

## P. 404 페이지 — 1건 (보충 감사 신규)

### [404-L-01] 404 페이지 — 검색 기능 및 추천 링크 부재 (보충 감사 신규)

- **현상**: `not-found.tsx`에서 404 에러 시 "404" 숫자, 에러 메시지, 홈으로 가기 링크만 제공. 사용자가 찾던 콘텐츠로 이동할 수 있는 검색 입력란, 인기 페이지 링크, 최근 방문 페이지 제안 등이 없음. 기본적인 404 페이지 구성은 갖추고 있으나(i18n 지원, 홈 링크, 반응형 레이아웃), 사용자 복귀 경로가 홈 하나뿐
- **위치**: `frontend/src/app/not-found.tsx`
- **영향**: 잘못된 URL 접근 시 사용자가 홈으로만 이동 가능. 대시보드, 포트폴리오, 도움말 등 주요 페이지로의 바로가기 부재
- **권장**: "대시보드", "포트폴리오", "도움말" 등 주요 페이지 링크 3~4개 추가. 선택적으로 SpotlightSearch 컴포넌트 연동
- **심각도**: Low

---

## Q. 테이블 정렬 — 1건 (보충 감사 신규)

### [SORT-M-01] 리더보드/주문 테이블 — aria-sort 및 정렬 방향 인디케이터 부재 (보충 감사 신규)

- **현상**: `leaderboard/page.tsx`에서 수익률/총자산 기준 정렬이 가능하지만, 현재 정렬 기준 열에 `aria-sort` 속성이 없고, 정렬 방향을 나타내는 시각적 인디케이터(▲/▼ 화살표)도 없음. 사용자는 "수익률순/총자산순" 토글 버튼으로 정렬을 변경할 수 있으나, 테이블 헤더에는 현재 어떤 열이 정렬 기준인지 표시되지 않음. 주문 페이지(`orders/page.tsx`)의 체결 내역 테이블도 서버 정렬(시간순)을 사용하지만 정렬 방향 표시 없음. `<th>` 또는 헤더 셀에 `aria-sort="ascending"`/`"descending"` 미적용
- **위치**: `frontend/src/app/(main)/leaderboard/page.tsx:344-370` (필터/정렬 UI 영역), `frontend/src/app/(main)/orders/page.tsx` (주문/체결 테이블 헤더)
- **영향**: 스크린 리더 사용자가 정렬 상태를 인지 불가. 시각 사용자도 테이블 데이터의 정렬 기준을 헤더에서 확인할 수 없음. WCAG 2.1 1.3.1(정보와 관계) 관련
- **권장**: 정렬 기준 열 헤더에 `aria-sort` 적용 + 시각적 화살표 아이콘(▲/▼) 추가. 클릭 가능한 열 헤더에는 `cursor-pointer` + hover 효과
- **심각도**: Medium

---

## R. 모바일 사용성 — 18건 (심층 감사 신규)

### [MOB-C-01] MainContent 하단 패딩 브레이크포인트 불일치 — BottomNav 겹침
- **현상**: `MainContent.tsx:24`에서 `pb-20 md:pb-0`으로 모바일 하단 패딩을 적용하지만, BottomNav는 `lg:hidden`(1024px)에서 사라짐. md(768px)~lg(1024px) 구간에서 패딩 0px인데 BottomNav(56px)가 여전히 표시되어 페이지 하단 콘텐츠가 BottomNav 뒤에 가려짐. 포트폴리오 출금 버튼, 주문 내역 마지막 행, 대시보드 하단 종목 등이 터치 불가능
- **위치**: `frontend/src/components/layout/MainContent.tsx:24`, `frontend/src/components/layout/BottomNav.tsx:23`
- **영향**: 768px~1024px 태블릿/대형 모바일에서 하단 콘텐츠 접근 불가. 실질적 기능 차단
- **권장**: `pb-20 md:pb-0` → `pb-20 lg:pb-0`으로 BottomNav 가시성과 패딩 브레이크포인트 일치시키기
- **심각도**: Critical

### [MOB-H-01] CopyTradeModal — max-height/overflow 미적용, 소형 뷰포트 오버플로
- **현상**: `CopyTradeModal.tsx:170`에서 모달 컨테이너가 `w-[420px] max-w-[calc(100vw-2rem)]`만 설정하고 `max-h`와 `overflow-y-auto`가 없음. 폼 필드 3개(비율 슬라이더, 최대 투자금, 손절 비율) + 액션 버튼 + 활성 상태 배지까지 포함 시 iPhone SE(568px 높이)에서 하단 버튼이 뷰포트 밖으로 밀림
- **위치**: `frontend/src/components/trading/CopyTradeModal.tsx:170`
- **영향**: 소형 단말에서 주문 제출 버튼 접근 불가, 카피트레이딩 기능 사용 차단
- **권장**: `max-h-[85vh] overflow-y-auto` 추가 또는 `max-h-[calc(100dvh-2rem)]` 적용
- **심각도**: High

### [MOB-H-02] UserProfileModal — max-height 미적용, 긴 포트폴리오 목록 시 오버플로
- **현상**: `UserProfileModal.tsx:133`에서 모달 컨테이너가 `w-[400px] max-w-[calc(100vw-2rem)]`만 설정. 내부 보유 종목 목록(`max-h-[200px]`)은 스크롤 가능하나 외부 컨테이너에 `max-h`가 없어 프로필 정보 + 통계 + 종목 목록 + 팔로우/카피 버튼까지 합산 시 소형 화면에서 오버플로. 닫기(X) 버튼은 상단에 있으나 하단 액션 버튼이 잘림
- **위치**: `frontend/src/components/leaderboard/UserProfileModal.tsx:133`
- **영향**: 소형 단말에서 팔로우/카피트레이드 버튼 접근 어려움
- **권장**: `max-h-[90vh] overflow-y-auto` 적용 또는 flex column + `flex-1 overflow-y-auto` 패턴 사용
- **심각도**: High

### [MOB-H-03] PriceAlertModal — 외부 컨테이너 max-height 미적용
- **현상**: `PriceAlertModal.tsx:148`에서 `w-full max-w-sm`만 설정. 내부 알림 목록에는 `max-h-48 overflow-y-auto`가 있으나, 외부 컨테이너에 `max-h` 없음. 알림 추가 폼(가격 입력 + 방향 선택) + 기존 알림 목록 + 버튼까지 합산 시 높이 초과 가능. 특히 키보드가 올라오면 가용 높이가 더 줄어듦
- **위치**: `frontend/src/components/alerts/PriceAlertModal.tsx:148`
- **영향**: 모바일에서 키보드 노출 시 확인 버튼 접근 어려움
- **권장**: 외부 컨테이너에 `max-h-[85vh] overflow-y-auto` 적용
- **심각도**: High

### [MOB-M-01] 주문 분석 통계 카드 — text-[10px] 모바일 가독성 저하
- **현상**: `orders/page.tsx:249,251`에서 통계 카드 라벨이 `text-[10px]`(md에서 11px), 보조 텍스트(`card.sub`)도 `text-[10px]` 고정. WCAG 권장 최소 12px 미달. 특히 "승리: 15 / 패배: 8" 같은 복합 정보가 10px에서 노안/고령 사용자에게 인지 어려움
- **위치**: `frontend/src/app/(main)/orders/page.tsx:249-251`
- **영향**: 주문 분석 핵심 지표 가독성 저하, 특히 고해상도 소형 단말(iPhone mini)에서 심화
- **권장**: `text-[10px]` → `text-[11px] md:text-[12px]`, 보조 텍스트 `text-[10px]` → `text-[11px]`
- **심각도**: Medium

### [MOB-M-02] 뉴스 날짜 필터 버튼 — 터치 영역 44px 미달
- **현상**: `news/page.tsx:271`에서 날짜 필터 버튼이 `px-3 py-2 text-[12px]`로 구성. 계산상 높이 약 36px(12px 텍스트 + 8px*2 패딩). Apple HIG 및 Material Design 권장 최소 터치 영역 44x44px 미달. 4개 버튼(전체/24시간/7일/30일)이 나란히 배치되어 오탭 발생 가능
- **위치**: `frontend/src/app/(main)/news/page.tsx:267-279`
- **영향**: 모바일에서 날짜 필터 오탭 빈도 증가, 특히 이동 중 한 손 조작 시
- **권장**: `py-2` → `py-2.5` 또는 `min-h-[44px]` 추가, 버튼 간 `gap-1` → `gap-1.5`
- **심각도**: Medium

### [MOB-M-03] 뉴스 검색 입력 필드 — 터치 영역 44px 미달
- **현상**: `news/page.tsx:257`에서 검색 입력이 `py-2.5 text-[14px]`로 구성. 계산상 높이 약 40px(14px*1.5 행간 + 10px*2 패딩). 44px 최소 권장에 약간 미달. Input 컴포넌트(`h-12` = 48px)와 달리 인라인 input 사용으로 높이가 더 낮음
- **위치**: `frontend/src/app/(main)/news/page.tsx:253-263`
- **영향**: 검색 입력 필드 탭 시 정밀 터치 요구
- **권장**: `py-2.5` → `py-3` 또는 공통 Input 컴포넌트 사용으로 `h-12`(48px) 통일
- **심각도**: Medium

### [MOB-M-04] CopyTradeModal 폼 입력 — 터치 영역 44px 미달
- **현상**: `CopyTradeModal.tsx:283,305`에서 `py-2.5 text-[14px]`의 인라인 input 사용. 높이 약 40px. 공통 Input 컴포넌트(`h-12` = 48px)를 사용하지 않아 터치 영역이 작음. 범위 슬라이더(`type="range"`)도 기본 스타일로 모바일에서 조작이 난해
- **위치**: `frontend/src/components/trading/CopyTradeModal.tsx:278-306`
- **영향**: 카피트레이딩 설정 시 입력 정확도 저하
- **권장**: 인라인 input을 공통 Input 컴포넌트로 교체하거나 `h-12` 통일, 슬라이더에 `touch-action: none` 추가
- **심각도**: Medium

### [MOB-M-05] truncate 요소 77개 — title 속성 전무
- **현상**: 프로젝트 전체에서 `truncate` 클래스가 적용된 요소 77개 중 `title` 속성이 설정된 요소가 0개. 말줄임 처리된 텍스트의 전체 내용을 확인할 방법 없음. 특히 `orders/page.tsx:661`(종목명), `portfolio/page.tsx:258`(보유 종목명), `leaderboard/page.tsx:399,524`(사용자 닉네임) 등 핵심 정보가 잘려도 전문 확인 불가
- **위치**: 프로젝트 전역 77개소 — 주요: `orders/page.tsx:661,682,835-844`, `portfolio/page.tsx:258`, `leaderboard/page.tsx:399,524`, `asset/[symbol]/page.tsx:186,428`
- **영향**: 모바일에서 좁은 화면으로 truncate 빈도가 높아지나 long-press/hover 시 전체 텍스트 확인 불가
- **권장**: 동적 데이터가 표시되는 truncate 요소에 `title={value}` 추가. React 컴포넌트화하여 `<TruncateText text={value} />` 공통 컴포넌트 도입 권장
- **심각도**: Medium

### [MOB-M-06] 주문 시간대 분포 차트 시간 라벨 — text-[9px] 판독 불가
- **현상**: `orders/page.tsx:296`에서 24시간 바 차트 하단 시간 라벨이 `text-[9px] md:text-[11px]`. 모바일에서 9px 텍스트는 대부분의 사용자에게 판독 불가. 24개 라벨이 3px 간격으로 밀집 배치되어 개별 시간 식별 어려움
- **위치**: `frontend/src/app/(main)/orders/page.tsx:293-300`
- **영향**: 주문 시간대 분석 차트의 핵심 정보(시간)가 읽히지 않음
- **권장**: 모바일에서 짝수 시간만 표시(0, 2, 4, ..., 22) 또는 매 6시간(0, 6, 12, 18)만 표시하고 `text-[10px]` 이상 적용
- **심각도**: Medium

### [MOB-M-07] OrderSheet 모달 — 키보드 노출 시 스크롤 제한
- **현상**: `OrderSheet.tsx:81`에서 `max-h-[85vh] overflow-y-auto`가 적용되어 있으나, 모바일 키보드(화면 40~50% 차지) 노출 시 가용 높이가 약 50vh로 줄어듦. 주문 유형 탭 4개 + 가격/수량/트리거 입력 + 비율 선택 + 예상 금액 + 제출 버튼까지 포함 시 스크롤이 필요하나 `85vh` 기준이 키보드 높이를 고려하지 않음
- **위치**: `frontend/src/components/trading/OrderSheet.tsx:81`
- **영향**: 키보드 사용 시 제출 버튼이나 예상 금액이 보이지 않아 블라인드 제출 유도
- **권장**: `max-h-[85vh]` → `max-h-[85dvh]` 사용(dynamic viewport height) 또는 `visualViewport` API로 가용 높이 동적 계산
- **심각도**: Medium

### [MOB-M-08] 뉴스 AI 분석 모달 — 포커스 트랩 미적용
- **현상**: `news/page.tsx:357-484`에서 AI 분석 모달이 인라인으로 구현되어 있고 `useFocusTrap` 미사용. 모달 열린 상태에서 Tab 키로 배경 요소에 포커스 이동 가능. DashboardAiModal은 별도 컴포넌트로 분리되어 `useFocusTrap` 적용 완료이나, 뉴스 페이지의 동일 기능 모달은 미적용 상태
- **위치**: `frontend/src/app/(main)/news/page.tsx:357-484`
- **영향**: 모바일 스크린 리더 사용자가 모달 외부로 포커스 이탈, 접근성 위반 (WCAG 2.4.3)
- **권장**: DashboardAiModal처럼 별도 컴포넌트로 분리 후 `useFocusTrap` 적용, 또는 인라인 `ref` + `useFocusTrap` 추가
- **심각도**: Medium

### [MOB-M-09] LoginSmsModal — max-height 미적용
- **현상**: `LoginSmsModal.tsx:186`에서 `max-w-[360px]`만 설정, `max-h`와 `overflow-y-auto` 없음. SMS 인증 폼(전화번호 입력 + 인증번호 입력 + 타이머 + 재전송 + 확인 버튼)이 세로로 길어질 수 있으며 에러 메시지 표시 시 높이가 더 증가. 소형 화면에서 키보드 노출 시 버튼 접근 불가
- **위치**: `frontend/src/components/auth/LoginSmsModal.tsx:186`
- **영향**: 소형 단말 + 키보드 노출 상태에서 인증 완료 버튼 접근 어려움
- **권장**: `max-h-[90vh] overflow-y-auto` 또는 `max-h-[90dvh]` 적용
- **심각도**: Medium

### [MOB-M-10] 뉴스 탭 바 + AI 버튼 — 320px 뷰포트 넘침
- **현상**: `news/page.tsx:208-246`에서 카테고리 탭 3개(암호화폐/국내주식/해외주식)와 AI 분석 버튼(`min-w-[120px]`)이 같은 행에 배치. 320px(iPhone SE) 뷰포트에서 탭 3개(각 ~80px) + AI 버튼(120px) = 약 360px으로 뷰포트 초과. `flex` 레이아웃이라 축소되지만 탭 텍스트가 잘리거나 버튼이 줄어듦
- **위치**: `frontend/src/app/(main)/news/page.tsx:208-246`
- **영향**: 초소형 뷰포트에서 탭 라벨 가독성 저하 및 AI 버튼 탭 어려움
- **권장**: AI 버튼을 탭 바 아래 별도 행으로 이동하거나 `flex-wrap` 적용, 또는 sm 이하에서 아이콘만 표시
- **심각도**: Medium

### [MOB-L-01] BottomNav 라벨 — text-[11px] 최소 권장 미달
- **현상**: `BottomNav.tsx:35,49,59,69` 등에서 탭 라벨이 `text-[11px]`. iOS HIG 권장 탭 바 라벨 최소 10pt(약 13px), Material Design 권장 12sp(약 12px). 11px는 경계선이나, 한글 2~3글자(대시보드, 포트폴리오, 리더보드) 표시 시 획이 뭉침
- **위치**: `frontend/src/components/layout/BottomNav.tsx:35,49,59,69,86,97,108`
- **영향**: 고해상도 소형 단말에서 한글 라벨 가독성 미흡
- **권장**: `text-[11px]` → `text-[12px]`으로 1px 상향
- **심각도**: Low

### [MOB-L-02] asset/[symbol] 고정 바 — sticky bottom 중복 선언
- **현상**: `asset/[symbol]/page.tsx:520`에서 `sticky bottom-0 left-0 right-0 z-40 ... safe-bottom px-4 py-3 pb-8 lg:bottom-0 bottom-[56px] mb-2`. `bottom-0`과 `bottom-[56px]`이 동일 요소에 존재하여 Tailwind 빌드 순서에 따라 어느 것이 적용될지 비결정적. 의도는 BottomNav 위에 고정하려는 것이나 `safe-bottom` + `pb-8`도 중복
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:520`
- **영향**: BottomNav와의 간격이 기기/브라우저에 따라 불일치, iOS safe-area 이중 패딩
- **권장**: `bottom-0 bottom-[56px]` → `bottom-[56px] lg:bottom-0`으로 정리, `safe-bottom` 적용 시 `pb-8` 제거
- **심각도**: Low

### [MOB-L-03] 주문 분석 통계 카드 값 — truncate 시 금액 잘림
- **현상**: `orders/page.tsx:250`에서 통계 카드 값이 `text-[16px] font-extrabold truncate`. 한화(KRW) 모드에서 금액이 "₩1,234,567,890" 같이 길어질 경우 truncate로 뒷자리가 잘려 "₩1,234,567,8..."로 표시되어 실제 금액 파악 불가. title 속성도 없어 전체 값 확인 불가
- **위치**: `frontend/src/app/(main)/orders/page.tsx:250`
- **영향**: 총 거래 대금, 평균 거래 규모 등 핵심 금융 데이터가 잘려서 표시
- **권장**: `truncate` 대신 `text-[14px] md:text-[16px]` 반응형 축소 또는 `title={card.value}` 추가
- **심각도**: Low

### [MOB-L-04] 뉴스 AI 모달 닫기 버튼 — 터치 영역 소형
- **현상**: `news/page.tsx:373`에서 닫기 버튼이 `p-1.5 rounded-lg`. 아이콘 크기 `w-4.5 h-4.5`(18px)에 패딩 6px 양쪽 = 총 30px. Apple HIG 44px 최소 터치 영역 미달. DashboardAiModal도 동일 패턴(`DashboardAiModal.tsx:80`)
- **위치**: `frontend/src/app/(main)/news/page.tsx:373`, `frontend/src/components/dashboard/DashboardAiModal.tsx:80`
- **영향**: 모달 닫기 시 정밀 터치 요구, 오탭으로 배경 클릭 발생 가능
- **권장**: `p-1.5` → `p-2.5` 또는 `min-w-[44px] min-h-[44px]` 추가
- **심각도**: Low

---

## 종합 평가

7차 UX 감사(보충 감사 + 모바일 사용성 심층 감사 포함)에서 총 **74건**의 이슈를 발견하였습니다. 6차에서 지적된 31건은 **전량 미수정**이며, 7차 본 감사에서 **16건**, 보충 감사에서 **9건**, 모바일 사용성 심층 감사에서 **18건**이 추가 발견되었습니다.

### 7차 신규 발견 이슈 (본 감사 16건 + 보충 감사 9건 + 모바일 심층 18건):

**애니메이션/트랜지션 (6건):**
1. **[ANI-H-01] 페이지 전환 애니메이션 부재** — SPA 전환 시 하드 컷, `ScrollToTop`에서 즉시 스크롤 이동
2. **[ANI-M-01] Tabs 언더라인 인디케이터 점프** — 활성 탭 변경 시 슬라이딩 전환 없이 즉시 교체
3. **[ANI-M-02] 리스트 아이템 스태거 애니메이션 부재** — 모든 리스트에서 아이템이 동시 등장
4. **[ANI-M-03] 스켈레톤→실제 콘텐츠 크로스페이드 부재** — 하드 스왑으로 시각적 불안정
5. **[ANI-L-01] 드롭다운 닫힘 애니메이션 부재** — 열림은 애니메이션, 닫힘은 즉시 사라짐
6. **[ANI-L-02] 모달 닫힘 애니메이션 부재** — 열림은 scale+slide 애니메이션, 닫힘은 즉시 언마운트

**타이포그래피/가독성 (5건):**
7. **[TYP-M-01] body line-height 미설정** — 본문 텍스트 가독성 최적 범위(1.5~1.7) 미달
8. **[TYP-M-02] 헤더 네비게이션 13px** — 저해상도 모니터에서 가독성 부족
9. **[TYP-L-01] 금융 데이터 전용 폰트 미적용** — Pretendard tabular-nums 의존
10. **[TYP-L-02] 시맨틱 헤딩 태그 미사용** — 내부 페이지에서 h1~h3 대신 div/span 사용
11. **[TYP-L-03] BottomNav 11px 라벨** — iOS/Android 최소 권장 크기 미달

**사용자 경험 개선 (5건):**
12. **[UX-M-01] 첫 방문 온보딩 부재** — 고급 기능 발견성 부족
13. **[UX-M-02] 전역 데이터 갱신 시각 미표시** — WebSocket 상태 인디케이터 없음
14. **[UX-M-03] 키보드 단축키 발견성 부족** — `?` 키 도움말 미제공
15. **[UX-L-01] 스크롤 위치 보존 미유지** — 뒤로 가기 시 최상단 리셋
16. **[UX-L-02] 브레이크포인트 전환 갭** — 1024px~1120px 네비게이션 부재 구간

**보충 감사 신규 (9건):**
17. **[CB-M-01] 상승/하락 색상만 사용** — 색각 이상 사용자를 위한 비색상 보조 지표(▲/▼) 부재 (OrderBook, AssetList, BalanceCard, 리더보드)
18. **[CHART-M-01] CandlestickChart 스크린 리더 접근성 부재** — role, aria-label 없는 canvas 차트
19. **[FVAL-M-01] OrderForm 인라인 에러 미표시** — 주문 실패 시 필드별 에러가 아닌 토스트/모달만 사용
20. **[ASYNC-M-01] 리더보드 팔로우 버튼 isPending 미표시** — 비동기 처리 중 로딩 피드백 없음
21. **[404-L-01] 404 페이지 추천 링크 부재** — 홈 링크만 제공, 검색/주요 페이지 바로가기 없음
22. **[SORT-M-01] 테이블 aria-sort 및 정렬 인디케이터 부재** — 리더보드/주문 테이블 정렬 상태 미표시

**모바일 사용성 심층 감사 (18건):**
23. **[MOB-C-01] MainContent 하단 패딩 브레이크포인트 불일치** — pb-20→md:pb-0 vs BottomNav lg:hidden, 768~1024px 콘텐츠 겹침 (Critical)
24. **[MOB-H-01] CopyTradeModal max-height 미적용** — 소형 뷰포트에서 하단 버튼 접근 불가
25. **[MOB-H-02] UserProfileModal max-height 미적용** — 프로필+종목 목록이 뷰포트 초과
26. **[MOB-H-03] PriceAlertModal 외부 max-height 미적용** — 키보드 노출 시 버튼 접근 불가
27. **[MOB-M-01] 주문 분석 통계 카드 text-[10px]** — WCAG 최소 12px 미달, 핵심 지표 가독성 저하
28. **[MOB-M-02] 뉴스 날짜 필터 버튼 36px** — 44px 최소 터치 영역 미달
29. **[MOB-M-03] 뉴스 검색 입력 ~40px** — 44px 최소 터치 영역 미달, 공통 Input(h-12) 미사용
30. **[MOB-M-04] CopyTradeModal 폼 입력 ~40px** — 공통 Input 미사용, 터치 영역 미달
31. **[MOB-M-05] truncate 77개소 title 전무** — 말줄임 텍스트 전문 확인 불가
32. **[MOB-M-06] 주문 시간대 차트 text-[9px]** — 24개 시간 라벨 판독 불가
33. **[MOB-M-07] OrderSheet 키보드 노출 시 스크롤** — max-h-[85vh]가 키보드 높이 미고려
34. **[MOB-M-08] 뉴스 AI 모달 포커스 트랩 미적용** — Tab 키로 배경 요소 포커스 이탈
35. **[MOB-M-09] LoginSmsModal max-height 미적용** — 소형 화면+키보드에서 인증 버튼 접근 불가
36. **[MOB-M-10] 뉴스 탭+AI 버튼 320px 넘침** — 탭 3개+AI 버튼이 뷰포트 초과
37. **[MOB-L-01] BottomNav 라벨 text-[11px]** — 한글 획 뭉침, 12px 권장
38. **[MOB-L-02] asset/[symbol] 고정 바 sticky bottom 중복** — bottom-0과 bottom-[56px] 비결정적
39. **[MOB-L-03] 주문 통계 카드 금액 truncate** — KRW 모드 긴 금액 잘림, title 없음
40. **[MOB-L-04] AI 모달 닫기 버튼 30px** — 44px 최소 터치 영역 미달

### 긍정적 사항:

- **모달 열림 애니메이션 우수**: `animate-modal-backdrop`(fade), `animate-modal-content`(scale 0.97→1 + translateY 8px→0, cubic-bezier(0.16, 1, 0.3, 1)) — 부드러운 스프링 곡선으로 자연스러운 진입 효과
- **BottomSheet 방향별 애니메이션**: 모바일은 `bottomsheet-slide-up`(하단→위), 데스크톱은 `bottomsheet-scale-in`(중앙 스케일) — 디바이스 유형별 최적화
- **AnimatedNumber 자릿수 슬롯 애니메이션**: 각 숫자가 개별적으로 위/아래 슬라이드(400ms, cubic-bezier(0.22, 1, 0.36, 1)) — 가격 변동의 실시간 감각 전달
- **가격 변동 플래시**: `tick-flash-rise`(빨강), `tick-flash-fall`(파랑) 1초 배경색 플래시 — 호가창/종목 목록에서 변동 즉시 시각 피드백
- **prefers-reduced-motion 대응**: globals.css에서 marquee, modal, toast, chat-panel, dropdown, tick-flash 등 모든 커스텀 애니메이션을 `animation: none !important`로 비활성화. Header의 slide-in-right도 개별 처리
- **tabular-nums 광범위 적용**: 금융 데이터가 표시되는 38개 파일(178회)에서 `tabular-nums` 클래스를 일관 적용
- **Pretendard Variable 폰트**: CDN에서 dynamic subset으로 한글/영문 모두 지원, `font-display: swap`으로 FOIT 방지, `preconnect`로 DNS/TLS 사전 연결
- **버튼 질감 시스템**: `btn-filled`(상단 하이라이트 + 하단 그림자), `btn-outline`(미세 보더), `btn-ghost`(눌림만) — `active:translateY(1px)` 눌림 효과로 물리적 피드백
- **BottomNav 터치 피드백**: `active:scale-95 transition-all duration-100` — 탭 시 95% 축소 효과로 터치 반응 즉시 시각 피드백
- **smooth scrolling 일관 적용**: 탭 전환 시 `window.scrollTo({ top: 0, behavior: 'smooth' })` — 대시보드, 포트폴리오, 주문, 뉴스, 리더보드, 도움말 6개 페이지 + Pagination 전체에 적용
- **채팅 패널 애니메이션**: `animate-chat-panel-in`(scale 0.95→1 + translateY 8px→0, 250ms) — 플로팅 채팅 패널 부드러운 진입
- **토스트 애니메이션 다양성**: 일반 토스트 `animate-toast-fade`(4초 fade), 실시간 토스트 `animate-live-toast-in`(우측→좌 슬라이드, 4초) — 용도별 차별화된 진입 효과
- **테마 전환 애니메이션**: body 및 주요 레이아웃 요소에 `transition: background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s` — 다크/라이트 모드 전환 시 부드러운 색상 전이

### 보충 감사 — 검증 완료 항목 (이슈 아님)

**다크/라이트 모드 전환 (정상):**
- `globals.css:68,96`에서 body 및 주요 레이아웃 요소에 `transition: background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s` 적용 확인
- 테마 전환 시 부드러운 색상 전이 (플래시 없음)

**통화 포맷팅 일관성 (정상):**
- `format.ts`에서 `formatPrice`, `formatCurrency`, `formatPriceDisplay`, `formatCurrencyDisplay` 함수로 모든 통화 표시를 중앙 관리
- 포트폴리오(`formatCurrencyDisplay`), 주문(`formatPriceDisplay`), 리더보드(`formatCurrency`) 등 모든 페이지에서 일관된 함수 사용
- 로케일(ko/en)과 통화 모드(KRW/USD)에 따라 적절히 분기

**뒤로 가기 동작 (부분 정상):**
- `ScrollToTop.tsx`에서 `pathname` 변경 시 항상 스크롤 초기화 — UX-L-01로 이미 보고
- `router.back()` 대신 `href="/dashboard"` 하드코딩 이슈 — NAV-M-01로 이미 보고
- 브라우저 뒤로 가기 자체는 정상 동작 (SPA 히스토리 보존)

**모바일 BottomNav 콘텐츠 겹침 (부분 이슈):**
- `MainContent.tsx:24`에서 `pb-20 md:pb-0`으로 모바일 하단 패딩 적용
- 그러나 md(768px)~lg(1024px) 구간에서 패딩 0인데 BottomNav 표시 — BD-M-05로 성능 보고서에 보고

**비동기 버튼 로딩 상태 (대부분 정상):**
- OrderForm: `placeOrder.isPending` 적용 확인
- Portfolio 입금/출금: `deposit.isPending`, `withdraw.isPending` 적용 확인
- Mypage 비밀번호/초기화: `changePassword.isPending`, `resetAccount.isPending` 적용 확인
- Community 글 작성: `createPost.isPending || updatePost.isPending || uploadAttachment.isPending` 적용 확인
- 리더보드 팔로우/카피트레이드: **미적용** — ASYNC-M-01로 보고

### 우선 수정 권장 순서:

1. **Critical (1건)** — MOB-C-01: MainContent 하단 패딩 브레이크포인트를 `pb-20 lg:pb-0`으로 즉시 수정 (1줄 변경)
2. **High — 모바일 모달 오버플로 (3건)** — CopyTradeModal(MOB-H-01), UserProfileModal(MOB-H-02), PriceAlertModal(MOB-H-03): `max-h-[85vh] overflow-y-auto` 일괄 적용
3. **High (1건)** — 페이지 전환 애니메이션 (ANI-H-01): View Transitions API 또는 CSS opacity fade 적용
4. **Medium — 모바일 터치/가독성 (10건)** — 통계 카드 텍스트(MOB-M-01), 날짜 필터(MOB-M-02), 뉴스 검색(MOB-M-03), 카피트레이드 입력(MOB-M-04), truncate title(MOB-M-05), 차트 라벨(MOB-M-06), OrderSheet 키보드(MOB-M-07), 뉴스 AI 포커스 트랩(MOB-M-08), LoginSmsModal(MOB-M-09), 뉴스 탭 넘침(MOB-M-10)
5. **Medium — 접근성 보충 감사 (3건)** — 색각 접근성(CB-M-01), 차트 접근성(CHART-M-01), 테이블 정렬(SORT-M-01)
6. **Medium — 폼/버튼 보충 감사 (2건)** — OrderForm 인라인 에러(FVAL-M-01), 팔로우 버튼 로딩(ASYNC-M-01)
7. **Medium — 애니메이션/UX 신규 (6건)** — Tabs 슬라이딩 언더라인, 스태거 리스트 애니메이션, 스켈레톤→콘텐츠 크로스페이드, 온보딩 투어, 데이터 갱신 인디케이터, 키보드 단축키 도움말
8. **Medium — 타이포그래피 신규 (2건)** — body line-height 설정, 헤더 네비게이션 폰트 크기 상향
9. **Medium — 접근성 이관 (5건)** — 인라인 탭 ARIA, tabpanel, SpotlightSearch, Star/Bell aria-label, RoomList 키보드 접근
10. **Medium — 모달 포커스 트랩 이관 (3건)** — 뉴스 AI, MarketIndex, UserProfile 모달
11. **Medium — 폼/입력 이관 (3건)** — BottomSheet 초기화, 주문 수정 초기화, 주문 수정 포커스 링
12. **Medium — 기타 이관 (5건)** — OrderForm 모바일, safe-bottom 중복, AI 에러 분기, 뒤로 가기 경로, 뉴스 필터 피드백
13. **Low (25건)** — BottomNav 라벨(MOB-L-01), sticky bottom 중복(MOB-L-02), 통계 금액 truncate(MOB-L-03), 모달 닫기 버튼(MOB-L-04), 드롭다운/모달 닫힘 애니메이션, 금융 폰트, 시맨틱 헤딩, 스크롤 위치 보존, 브레이크포인트 갭, focus-visible, 404 추천 링크, 기타 이관
