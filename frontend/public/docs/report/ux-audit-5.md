# VirtuEx 사용자 UX 개선 감사 보고서 (5차)

**VirtuEx User Experience Improvement Audit Report (5th)**

- 감사일: 2026-03-20
- 감사 범위: 모바일 반응형(320px 기준), 접근성(ARIA/포커스/대비), 폼/입력 UX, 로딩/에러 상태, 네비게이션 흐름, 정보 구조, 모달/다이얼로그, 토스트 접근성, 테이블 반응형, 스켈레톤/스피너, 파괴적 동작 확인, 이미지 alt 텍스트, 간격/패딩 일관성
- 감사 방법: 소스 코드 직접 분석 (page.tsx, component.tsx 전체), WCAG 2.1 AA 기준 대조, 320px 뷰포트 기준 반응형 클래스 검사, ARIA 속성 및 포커스 관리 검증
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 4차 대비 **더 엄격한 기준**(320px 최소 너비, 모든 모달 키보드 트랩 검사, 스켈레톤 vs 스피너, 파괴적 동작 확인 다이얼로그)을 적용하였으며, 발견 사항만 기록하고 수정은 포함하지 않음

---

## 이전 감사 대비 수정 현황 (4차 → 5차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [RD-M-01] OrderForm 반응형 클래스 제한적 | **부분 수정** | 비율 수량 버튼에 `py-2 sm:py-1.5` 반응형 패딩 추가, 그러나 가격/수량 Input 및 주문 버튼의 모바일 전용 높이 미적용 |
| [RD-M-02] 종목 상세 고정 매수/매도 바 safe-bottom 중복 | **미수정** | `safe-bottom px-4 py-3 pb-8 lg:bottom-0 bottom-[56px] mb-2` 그대로 유지 |
| [RD-L-01] 포트폴리오 보유 종목 모바일 카드 그리드 단일 열 고정 | **미수정** | `grid-cols-1 sm:grid-cols-2` 유지 |
| [RD-L-02] 리더보드 필터 컨트롤 모바일 가로 오버플로우 | **미수정** | `flex-wrap` 사용 유지, 360px 미만에서 가로 넘침 가능 |
| [A11Y-M-01] ARIA 속성 — 다수 탭에 role 미적용 | **미수정** | 대시보드만 `role="tablist"` 적용, 커뮤니티/포트폴리오/주문/뉴스/리더보드 탭에 여전히 ARIA 역할 미적용 |
| [A11Y-M-02] RoomList 컨텍스트 메뉴 키보드 접근 불가 | **미수정** | `onContextMenu` 전용, 키보드/터치 대체 수단 없음 |
| [A11Y-L-01] CandlestickChart 지표 토글 비활성 상태 시각적 구분 약화 | **미수정** | 색상 opacity만으로 구분 유지 |
| [FRM-M-01] 비밀번호 표시/숨기기 토글 미구현 | **미수정** | 마이페이지 비밀번호 변경 모달 3개 필드 모두 `type="password"` 고정 |
| [FRM-M-02] 입금/출금 BottomSheet 닫기 시 입력값 미초기화 | **미수정** | `onClose`에서 `setDepositAmount('')` 미호출 |
| [FRM-L-01] 주문 수정 취소 시 editPrice/editQuantity 미초기화 | **미수정** | 취소 시 `setEditingOrderId(null)` 만 호출, `setEditPrice('')`/`setEditQuantity('')` 미호출 |
| [LD-M-01] AI 분석 에러 유형 미구분 | **미수정** | catch 블록에서 모든 에러를 `setAiError(true)` 단일 처리 |
| [LD-L-01] 리더보드 빈 상태 메시지 목록 div 내부 배치 | **미수정** | `divide-y divide-border/40` 내부에 빈 상태 메시지 유지 |
| [NAV-M-01] 종목 상세 뒤로 가기 하드코딩 | **미수정** | `href="/dashboard"` 하드코딩 유지 |
| [NAV-L-01] 포트폴리오 보유 종목 없음 시 거래 분석 링크 부재 | **미수정** | 대시보드 링크만 제공 |
| [INF-M-01] 대시보드 AI 분석 뉴스 수/시간 미표시 | **미수정** | 모달 헤더에 부가 정보 없음 |
| [INF-L-01] 주문 확인 모달 문자열 연결 메시지 | **미수정** | `\n` 연결 형태 유지 |
| [SRH-M-01] 뉴스 검색 활성 필터 상태 피드백 부족 | **미수정** | 결과 건수/필터 초기화 버튼 미제공 |
| [SRH-L-01] AssetList 모바일 필터 변경 시 자동 접힘 미구현 | **미수정** | 필터 변경 시 `setMobileFilterOpen(false)` 미호출 |

**요약:** 4차에서 지적된 18건 중 **0건 완전 수정, 1건 부분 수정, 17건 미수정**.

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 모바일 반응형 | 0 | 1 | 3 | 2 | 6 |
| B. 접근성 (A11Y) | 0 | 2 | 4 | 2 | 8 |
| C. 폼/입력 UX | 0 | 1 | 3 | 1 | 5 |
| D. 로딩/에러 상태 | 0 | 0 | 2 | 1 | 3 |
| E. 네비게이션/흐름 | 0 | 0 | 2 | 1 | 3 |
| F. 정보 구조/표시 | 0 | 0 | 2 | 2 | 4 |
| G. 모달/다이얼로그 | 0 | 1 | 2 | 0 | 3 |
| H. 기타 | 0 | 0 | 1 | 1 | 2 |
| **합계** | **0** | **5** | **19** | **10** | **34** |

---

## A. 모바일 반응형 — 6건

### [RD-H-01] 리더보드 필터 영역 — 320px에서 가로 오버플로우 및 터치 타겟 부족
- **현상**: `leaderboard/page.tsx:327-385`의 필터 영역이 `flex-wrap`이지만, 320px 뷰포트에서 투자자 토글 + 카피트레이딩 토글 + 참여자 수 + 내 순위 + 정렬 탭이 한 줄에 배치되면 콘텐츠가 넘침. 토글 스위치가 `w-[34px] h-[18px]`로 최소 터치 타겟(44x44px)에 미달. 정렬 탭 버튼(`px-3 py-1.5`)도 44px 높이 미달
- **위치**: `frontend/src/app/(main)/leaderboard/page.tsx:327-385`
- **영향**: 320px 디바이스에서 가로 스크롤 발생 또는 콘텐츠 겹침, 작은 터치 타겟으로 오조작 유발
- **권장**: 토글 스위치에 `min-h-[44px]` 터치 영역 래퍼 추가, 정렬 탭을 모바일에서 별도 행으로 분리하거나 드롭다운으로 전환
- **심각도**: High

### [RD-M-01] OrderForm — 모바일 전용 높이/패딩 미적용 (4차 부분 수정, 여전히 부족)
- **현상**: `OrderForm.tsx:247-404`에서 비율 수량 버튼에 반응형 패딩(`py-2 sm:py-1.5`)이 추가되었으나, 가격/수량 Input 컴포넌트(`h-12`)와 주문 버튼(`h-[52px]`)에는 모바일 전용 클래스가 없음. 320px에서 `space-y-4` 간격만으로 폼 요소가 밀집
- **위치**: `frontend/src/components/trading/OrderForm.tsx:247-404`
- **영향**: 320px 화면에서 주문 입력 시 터치 타겟 간 여백 부족으로 오탭 가능
- **권장**: 모바일에서 `space-y-5` 이상 적용, Input 높이를 모바일에서 48px 이상으로 확대
- **심각도**: Medium

### [RD-M-02] 종목 상세 — 고정 매수/매도 바 safe-bottom + pb-8 중복 (4차 미수정)
- **현상**: `asset/[symbol]/page.tsx:520`의 하단 고정 바에 `safe-bottom px-4 py-3 pb-8 lg:bottom-0 bottom-[56px] mb-2`가 적용. `safe-bottom`과 `pb-8`이 중복되어 iPhone 노치 기기에서 과도한 하단 여백 발생. 또한 `bottom-[56px]`은 BottomNav 존재를 가정하지만 lg 이상에서는 BottomNav가 숨겨짐
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:520`
- **영향**: 일부 기기에서 매수/매도 버튼이 과도하게 위로 올라가거나 콘텐츠와 겹칠 수 있음
- **권장**: `safe-bottom` 적용 시 `pb-8` 제거, BottomNav 존재 여부에 따라 조건부 bottom offset 적용
- **심각도**: Medium

### [RD-M-03] 주문 분석 탭 — 시간대별 분포 바 차트 320px에서 가독성 저하
- **현상**: `orders/page.tsx:261-300`의 24시간 바 차트가 `flex items-end gap-[3px]`로 배치. 320px에서 24개 바가 각 약 10px 너비로 줄어들어 터치 불가, 카운트 라벨(`text-[10px]`)이 겹침. 시간 라벨(`text-[9px]`)도 320px에서 판독 어려움
- **위치**: `frontend/src/app/(main)/orders/page.tsx:261-300`
- **영향**: 320px 디바이스에서 시간대별 거래 분포 차트의 바와 라벨이 겹치며 정보 전달 불가
- **권장**: 모바일에서 12시간 단위 그룹핑 또는 가로 스크롤 컨테이너 적용, 카운트 라벨은 hover/tap으로만 표시
- **심각도**: Medium

### [RD-L-01] 포트폴리오 Market Pulse — 단일 열 그리드 (4차 미수정)
- **현상**: `portfolio/page.tsx:233`의 Market Pulse 섹션이 `grid-cols-1 sm:grid-cols-2`로 배치. 보유 종목 10개+ 시 모바일에서 과도한 세로 스크롤
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:233`
- **영향**: 다수 보유 종목 시 모바일에서 과도한 세로 스크롤
- **권장**: 모바일에서 카드 높이를 줄이고 핵심 정보(심볼, 수익률)만 표시하는 컴팩트 레이아웃 적용
- **심각도**: Low

### [RD-L-02] 뉴스 AI 분석 버튼 — 320px에서 탭 바와 동일 행 배치 시 넘침
- **현상**: `news/page.tsx:242-260`에서 AI 분석 버튼(`min-w-[120px] px-4`)이 탭 바(`flex-1`)와 같은 행에 `ml-auto`로 배치. 320px에서 3개 카테고리 탭 + AI 버튼이 한 줄에 들어가면 텍스트가 잘리거나 가로 스크롤 발생
- **위치**: `frontend/src/app/(main)/news/page.tsx:222-260`
- **영향**: 320px 디바이스에서 AI 분석 버튼 또는 카테고리 탭이 잘릴 수 있음
- **권장**: AI 분석 버튼을 모바일에서 아이콘만 표시하거나 탭 바 아래 별도 행으로 분리
- **심각도**: Low

---

## B. 접근성 (A11Y) — 8건

### [A11Y-H-01] Skip Navigation 링크 부재
- **현상**: 전체 프론트엔드에서 "Skip to main content" 링크가 존재하지 않음. `Header.tsx`에서 네비게이션 메뉴가 최상단에 위치하여, 키보드/스크린 리더 사용자가 페이지마다 모든 네비게이션 링크를 탭해야 본문에 도달
- **위치**: `frontend/src/components/layout/Header.tsx:100-375`
- **영향**: WCAG 2.1 2.4.1 "Bypass Blocks" 위반, 키보드 사용자의 페이지 탐색 효율 심각하게 저하
- **권장**: `<header>` 직전에 `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>` 추가, `<main>` 요소에 `id="main-content"` 부여
- **심각도**: High

### [A11Y-H-02] 전역 버튼 포커스 링 부재
- **현상**: `Button.tsx`의 모든 변형(primary, secondary, danger, buy, sell, ghost)에 `focus:ring` 또는 `focus-visible:ring` 클래스가 없음. `Input.tsx`에만 `focus:ring-2 focus:ring-accent/20`이 적용. 탭 네비게이션, 모달 내부 버튼, 주문 폼 버튼 등 모든 `<button>` 요소에서 포커스 상태가 시각적으로 구분되지 않음
- **위치**: `frontend/src/components/ui/Button.tsx:38-44`
- **영향**: WCAG 2.1 2.4.7 "Focus Visible" 위반, 키보드 사용자가 현재 포커스된 버튼을 식별 불가
- **권장**: `base` 클래스에 `focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary` 추가
- **심각도**: High

### [A11Y-M-01] 탭 UI ARIA 역할 미적용 — 5개 페이지 (4차 미수정, 범위 확대)
- **현상**: 대시보드만 `role="tablist"` + `role="tab"` + `aria-selected`가 적용됨. 다음 페이지의 탭 UI에는 ARIA 역할 미적용:
  - 커뮤니티 (`community/page.tsx:179-202`)
  - 주문 (`orders/page.tsx:485-506`)
  - 포트폴리오 (`portfolio/page.tsx:148-166`)
  - 리더보드 (`leaderboard/page.tsx:305-323`)
  - 뉴스 (`news/page.tsx:222-240`)
  - 종목 상세 호가창/체결 탭 (`asset/[symbol]/page.tsx:438-439` — Tabs 컴포넌트 사용)
  - Tabs 공통 컴포넌트 (`Tabs.tsx:69-87`) 자체에도 `role` 미적용
- **위치**: `frontend/src/components/ui/Tabs.tsx:39-88`, 각 페이지 탭 영역
- **영향**: 스크린 리더 사용자가 탭 구조를 인식하지 못함, WCAG 2.1 4.1.2 위반
- **권장**: `Tabs.tsx` 공통 컴포넌트에 `role="tablist"`, 탭 버튼에 `role="tab"` + `aria-selected`, 탭 패널에 `role="tabpanel"` 일괄 적용
- **심각도**: Medium

### [A11Y-M-02] 토스트 알림 — aria-live 영역 부재
- **현상**: `ToastContainer.tsx`와 `LiveToastContainer.tsx` 모두 `aria-live` 속성이 없음. 토스트가 나타나도 스크린 리더가 자동으로 읽어주지 않음. 닫기 버튼에 `aria-label="Close"`는 적용되어 있으나, 토스트 메시지 자체가 ARIA 라이브 리전으로 선언되지 않음
- **위치**: `frontend/src/components/ui/ToastContainer.tsx:37-62`, `frontend/src/components/ui/LiveToastContainer.tsx:81-111`
- **영향**: 스크린 리더 사용자가 토스트 알림(주문 성공, 에러, 가격 알림 등) 내용을 인식하지 못함
- **권장**: 컨테이너 div에 `role="status" aria-live="polite"` 적용 (에러 토스트는 `aria-live="assertive"`)
- **심각도**: Medium

### [A11Y-M-03] RoomList 컨텍스트 메뉴 키보드 접근 불가 (4차 미수정)
- **현상**: `RoomList.tsx`의 컨텍스트 메뉴가 `onContextMenu`(우클릭)로만 열림. 키보드 사용자나 터치 기기 사용자가 채팅방 이름변경/퇴장 기능에 접근할 수 없음
- **위치**: `frontend/src/components/chat/RoomList.tsx:100-103`
- **영향**: 키보드 전용 사용자의 채팅방 관리 기능 접근 차단
- **권장**: 더보기(...) 아이콘 버튼 추가 또는 Shift+F10 키바인딩 지원
- **심각도**: Medium

### [A11Y-M-04] 채팅방 퇴장 — 네이티브 confirm() 사용
- **현상**: `RoomList.tsx:128`에서 `confirm(t('chat.leaveConfirm'))`, `ChatPanel.tsx:155`에서 `window.confirm(t('chat.confirmLeaveRoom'))`, `PinnedChatPanel.tsx:33`에서도 동일. 네이티브 `confirm()`은 스크린 리더 호환성이 낮고, 앱의 디자인 시스템(ConfirmModal)과 불일치
- **위치**: `frontend/src/components/chat/RoomList.tsx:128`, `frontend/src/components/chat/ChatPanel.tsx:155`, `frontend/src/components/chat/PinnedChatPanel.tsx:33`
- **영향**: 네이티브 다이얼로그는 다크 모드/테마/i18n 미적용, 사용자 경험 불일관
- **권장**: `ConfirmModal` 컴포넌트로 교체하여 디자인 일관성 및 접근성 확보
- **심각도**: Medium

### [A11Y-L-01] CandlestickChart 지표 토글 — 비색상 시각 표시 부재 (4차 미수정)
- **현상**: `CandlestickChart.tsx:517-531`의 지표 토글 버튼이 비활성 상태에서 색상 opacity(1 vs 0.35)만으로 구분. 색각 이상 사용자가 활성/비활성 상태를 구분하기 어려움
- **위치**: `frontend/src/components/chart/CandlestickChart.tsx:517-531`
- **영향**: 색각 이상 사용자의 지표 활성 상태 인식 어려움
- **권장**: 체크마크 아이콘, 테두리 두께 변화 등 비색상 시각 표시 추가
- **심각도**: Low

### [A11Y-L-02] 관심종목 Star 버튼 — aria-label 누락
- **현상**: `asset/[symbol]/page.tsx:189-198`의 관심종목 Star 버튼에 `aria-label`이 없음. 스크린 리더가 이 버튼의 용도를 알 수 없음. 동일 페이지의 Bell 버튼도 `aria-label` 없음(`page.tsx:200-218`)
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:189-198`, `:200-218`
- **영향**: 스크린 리더 사용자가 버튼 용도를 인식하지 못함
- **권장**: Star 버튼에 `aria-label={isWatchlisted ? t('watchlist.remove') : t('watchlist.add')}`, Bell 버튼에 `aria-label={t('alert.manage')}` 추가
- **심각도**: Low

---

## C. 폼/입력 UX — 5건

### [FRM-H-01] 비밀번호 변경 모달 — 표시/숨기기 토글 미구현 (4차→5차 미수정, 3회 연속)
- **현상**: `mypage/page.tsx:669-735`의 비밀번호 변경 모달에서 현재 비밀번호, 새 비밀번호, 확인 필드 3개 모두 `type="password"` 고정. 반면 로그인 페이지(`login/page.tsx:117-136`)에는 Eye/EyeOff 토글이 구현되어 있어, 동일 프로젝트 내 UX 불일관. 3차 감사부터 지적되어 **3회 연속 미수정**
- **위치**: `frontend/src/app/(main)/mypage/page.tsx:669-735`
- **영향**: 복잡한 비밀번호 입력 시 오타 확인 불가, 특히 새 비밀번호와 확인 비밀번호 불일치 시 사용자 좌절감 증가
- **권장**: 로그인 페이지와 동일한 Eye/EyeOff 토글 패턴 적용 (각 필드별 독립 토글)
- **심각도**: High (3회 연속 미수정으로 심각도 상향)

### [FRM-M-01] 입금/출금 BottomSheet — 닫기 시 입력값 미초기화 (4차 미수정)
- **현상**: `portfolio/page.tsx:369-419`의 입금 BottomSheet에서 금액을 입력하다가 시트를 닫으면(`onClose`) 입력값이 `depositAmount` 상태에 남아있어 다음 열기 시 이전 값이 표시됨. 출금도 동일(`withdrawAmount`). 성공 시에는 초기화하지만 취소 시 미초기화
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:371, 425`
- **영향**: 사용자 혼란 — 이전에 입력하다 만 금액이 잔존
- **권장**: BottomSheet `onClose` 콜백에서 `setDepositAmount('')` / `setWithdrawAmount('')` 호출
- **심각도**: Medium

### [FRM-M-02] 주문 수정 취소 시 editPrice/editQuantity 미초기화 (4차 미수정)
- **현상**: `orders/page.tsx:634`에서 수정 취소 시 `setEditingOrderId(null)`만 호출. `editPrice`/`editQuantity` 상태가 이전 입력값을 유지. 다른 주문 수정 시 `startEditing`에서 해당 주문의 가격/수량으로 덮어쓰긴 하지만, 같은 주문을 재수정하면 이전 수정 중 입력값이 표시
- **위치**: `frontend/src/app/(main)/orders/page.tsx:634`
- **영향**: 같은 주문을 재수정할 때 취소 전 입력값이 초기값으로 나타남
- **권장**: 취소 시 `setEditPrice('')`/`setEditQuantity('')` 동시 호출
- **심각도**: Medium

### [FRM-M-03] 회원가입 폼 — 비밀번호 표시/숨기기 토글 미구현
- **현상**: `register/page.tsx`의 회원가입 폼에서 비밀번호와 비밀번호 확인 필드에 Eye/EyeOff 토글이 없음. 로그인 페이지에는 구현되어 있으나 회원가입에는 미적용. 회원가입 시 복잡한 비밀번호 규칙(8자 이상, 특수문자 등)을 충족하면서 오타 없이 입력하기 어려움
- **위치**: `frontend/src/app/(auth)/register/page.tsx` (비밀번호 필드)
- **영향**: 회원가입 시 비밀번호 입력 오류로 재시도 증가, 회원가입 이탈률 상승 가능
- **권장**: 로그인 페이지와 동일한 Eye/EyeOff 토글 패턴 적용
- **심각도**: Medium

### [FRM-L-01] 주문 수정 입력 필드 — 포커스 링 미적용
- **현상**: `orders/page.tsx:610-622`의 주문 수정 inline 입력 필드(`<input type="number">`)에 `focus:outline-none focus:ring` 등 포커스 스타일이 없음. 일반 Input 컴포넌트 대신 네이티브 input을 직접 사용하여 포커스 링이 브라우저 기본 스타일에 의존
- **위치**: `frontend/src/app/(main)/orders/page.tsx:610-622`
- **영향**: 디자인 시스템과 불일관한 포커스 스타일
- **권장**: Input 컴포넌트 사용 또는 동일한 포커스 클래스 적용
- **심각도**: Low

---

## D. 로딩/에러 상태 — 3건

### [LD-M-01] AI 분석 에러 유형 미구분 (4차 미수정)
- **현상**: `dashboard/page.tsx:205`과 `news/page.tsx:189`에서 AI 분석 catch 블록이 모든 에러를 `setAiError(true)` 단일 처리. 네트워크 에러, 타임아웃(60초), 서버 500 에러, AI 서비스 불가 등 원인별 안내 없음
- **위치**: `frontend/src/app/(main)/dashboard/page.tsx:205`, `frontend/src/app/(main)/news/page.tsx:189`
- **영향**: 사용자가 60초 대기 후 "오류 발생"만 표시되어 재시도 가능 여부 판단 불가
- **권장**: 에러 유형별 메시지 분기 (timeout → "시간 초과, 재시도", 503 → "AI 서비스 일시 불가" 등)
- **심각도**: Medium

### [LD-M-02] 뉴스 페이지 — 로딩 시 스켈레톤 대신 pulse 애니메이션만 사용
- **현상**: `news/page.tsx:298-305`에서 로딩 시 `<div className="h-24 rounded-xl bg-bg-secondary animate-pulse" />`만 표시. 뉴스 카드의 구조(제목, 요약, 출처, 날짜)를 반영하는 스켈레톤이 아닌 단순 직사각형 pulse. 대시보드(`AssetListSkeleton`), 포트폴리오(구조화된 스켈레톤), 리더보드(`Skeleton` 컴포넌트)는 구조화된 스켈레톤 사용
- **위치**: `frontend/src/app/(main)/news/page.tsx:298-305`
- **영향**: 뉴스 페이지만 비구조화된 로딩 표시로 사용자 인지 불일관, 콘텐츠 레이아웃 시프트(CLS) 증가
- **권장**: 뉴스 카드 구조를 반영하는 스켈레톤 컴포넌트(제목 바 + 2줄 요약 바 + 출처/날짜 바) 적용
- **심각도**: Medium

### [LD-L-01] 마이페이지 — 프로필 로딩 시 텍스트만 표시
- **현상**: `mypage/page.tsx:292-296`에서 로딩 상태가 `<div className="py-20 text-center text-text-quaternary text-[14px]">{t('common.loading')}</div>`로만 표시. 8개 카드(기본 정보, 계정, 알림, 비밀번호, 거래 통계, 활동, 최근 거래, 보안) 구조를 반영하는 스켈레톤 없이 단순 텍스트
- **위치**: `frontend/src/app/(main)/mypage/page.tsx:292-296`
- **영향**: 프로필 로딩 시 빈 화면에 "로딩 중" 텍스트만 표시되어 CLS 발생
- **권장**: 카드 그리드 구조를 반영하는 스켈레톤 레이아웃 적용
- **심각도**: Low

---

## E. 네비게이션/흐름 — 3건

### [NAV-M-01] 종목 상세 뒤로 가기 — 하드코딩 경로 (4차 미수정)
- **현상**: `asset/[symbol]/page.tsx:181`의 뒤로 가기 링크가 `href="/dashboard"`로 하드코딩. 커뮤니티, 포트폴리오, 검색, 리더보드, 뉴스 등 다양한 진입 경로에서 종목 상세에 접근할 수 있으나, 항상 대시보드로 돌아감
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:181`
- **영향**: 포트폴리오에서 종목 상세 진입 후 뒤로 가기 시 대시보드로 이동, 사용자 흐름 단절
- **권장**: `router.back()` 사용 또는 `useSearchParams`로 referrer 경로 저장 후 해당 경로로 복귀
- **심각도**: Medium

### [NAV-M-02] 뉴스 검색 — 활성 필터 상태 시각적 피드백 부족 (4차 미수정)
- **현상**: `news/page.tsx:121-132`에서 검색어와 날짜 필터가 동시 적용되어도 "N건 결과" 또는 "검색 중" 인디케이터가 없음. 기본 날짜 필터가 '24h'로 설정되어 있어 사용자가 "전체 뉴스"를 기대하더라도 24시간 이내 뉴스만 표시되지만 이를 알려주는 시각적 단서가 부족
- **위치**: `frontend/src/app/(main)/news/page.tsx:56, 121-132`
- **영향**: 사용자가 필터 상태를 인지하지 못하고 뉴스가 적다고 오해
- **권장**: 활성 필터 수 뱃지, "N건 결과" 카운터, 전체 필터 초기화 버튼 제공
- **심각도**: Medium

### [NAV-L-01] 포트폴리오 빈 상태 — 거래 분석 링크 부재 (4차 미수정)
- **현상**: `portfolio/page.tsx:332-344`에서 보유 종목이 없을 때 "종목 둘러보기" 링크만 대시보드로 연결. 거래 내역이 있는데 현재 보유 종목이 0인 경우(전량 매도), 거래 분석 탭으로의 안내가 없음
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:332-344`
- **영향**: 전량 매도 후 사용자가 자신의 거래 기록을 확인하려면 별도로 탭을 전환해야 함
- **권장**: "거래 분석 보기" 링크 추가하거나, 최근 거래 요약을 빈 상태 화면에 포함
- **심각도**: Low

---

## F. 정보 구조/표시 — 4건

### [INF-M-01] 대시보드 AI 분석 — 분석 범위 정보 미표시 (4차 미수정)
- **현상**: 대시보드 AI 분석 모달(`dashboard/page.tsx:425-512`)에서 "AI 시장 분석" 타이틀만 표시. 분석에 사용된 뉴스 건수(최대 50건), 분석 시간대(최근 24시간), 분석 완료 시각 정보가 없음. 뉴스 페이지 AI 분석에는 카테고리가 표시되어 상대적으로 맥락 정보가 있음
- **위치**: `frontend/src/app/(main)/dashboard/page.tsx:425-512`
- **영향**: 사용자가 분석의 범위와 시점을 알 수 없어 신뢰도 판단 어려움
- **권장**: 모달 헤더에 "최근 24시간 / N건 뉴스 기반" 부가 정보 표시, 분석 완료 시각 추가
- **심각도**: Medium

### [INF-M-02] 주문 확인 모달 — 비구조화 텍스트 나열 (4차 미수정)
- **현상**: `OrderForm.tsx:400`의 주문 확인 모달 message가 `\n` 문자열 연결로 구성. `${symbol} ${parsedQty} ${t('order.quantity')}\n${...}\n${...}` 형태로 가격, 수량, 총액이 단순 텍스트로 나열되어 시인성 저하
- **위치**: `frontend/src/components/trading/OrderForm.tsx:400`
- **영향**: 주문 실행 전 최종 확인 단계에서 핵심 정보(가격, 수량, 총액) 파악이 어려워 오주문 위험
- **권장**: ConfirmModal에 구조화된 레이아웃(label-value 쌍) 적용 또는 별도 OrderConfirmModal 컴포넌트 생성
- **심각도**: Medium

### [INF-L-01] 리더보드 빈 상태 — 구분선 불필요 표시 (4차 미수정)
- **현상**: `leaderboard/page.tsx:616-620`의 빈 상태 메시지(`leaderboard.empty`)가 `divide-y divide-border/40` 목록 div 내부에 위치하여 테이블 헤더와 빈 메시지 사이에 불필요한 구분선이 표시됨
- **위치**: `frontend/src/app/(main)/leaderboard/page.tsx:616-620`
- **영향**: 시각적 비일관성 — 빈 메시지 위에 불필요한 구분선
- **권장**: 빈 상태를 목록 div 외부로 이동하거나, 조건부로 테이블 헤더도 숨김
- **심각도**: Low

### [INF-L-02] AssetList 모바일 필터 — 변경 시 자동 접힘 미구현 (4차 미수정)
- **현상**: `AssetList.tsx`에서 모바일 필터 드롭다운이 펼쳐진 상태에서 카테고리/정렬/기간을 변경해도 드롭다운이 자동으로 접히지 않음. 사용자가 필터를 변경할 때마다 수동으로 닫아야 함
- **위치**: `frontend/src/components/market/AssetList.tsx`
- **영향**: 모바일에서 필터 변경 후 드롭다운이 화면 공간을 계속 차지
- **권장**: 필터 변경 핸들러에서 `setMobileFilterOpen(false)` 자동 호출
- **심각도**: Low

---

## G. 모달/다이얼로그 — 3건

### [MOD-H-01] CopyTradeModal — role="dialog", aria-modal, 포커스 트랩 모두 부재
- **현상**: `CopyTradeModal.tsx:114-120`에서 모달 최외곽 div에 `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 속성이 모두 없음. `useFocusTrap` 훅도 사용하지 않음. ESC 키 닫기와 `useScrollLock`은 적용되어 있으나, 키보드 포커스가 모달 외부로 이탈 가능. 같은 프로젝트의 다른 모달(ConfirmModal, OrderSheet, BottomSheet, ContentModal, LoginRequiredModal, PriceAlertModal)은 모두 ARIA 속성과 포커스 트랩을 갖추고 있어 불일관
- **위치**: `frontend/src/components/trading/CopyTradeModal.tsx:114-120`
- **영향**: 스크린 리더가 모달로 인식하지 못함, 키보드 포커스 트랩 부재로 WCAG 2.1 2.4.3 위반
- **권장**: `role="dialog" aria-modal="true" aria-labelledby="copy-trade-title"` 추가, `useFocusTrap` 적용
- **심각도**: High

### [MOD-M-01] 뉴스 AI 분석 모달 — 포커스 트랩 미적용
- **현상**: `news/page.tsx:370-497`의 AI 분석 모달에 `role="dialog" aria-modal="true" aria-labelledby`는 적용되어 있으나, `useFocusTrap`이 적용되지 않음. 대시보드 AI 분석 모달(`dashboard/page.tsx:84-87`)에는 `useFocusTrap`이 적용되어 있어 불일관. 키보드 사용자가 Tab으로 모달 외부 요소에 도달 가능
- **위치**: `frontend/src/app/(main)/news/page.tsx:370-497`
- **영향**: 뉴스 AI 분석 모달에서 키보드 포커스가 모달 외부로 이탈 가능
- **권장**: `useRef` + `useFocusTrap` 패턴을 대시보드 AI 모달과 동일하게 적용
- **심각도**: Medium

### [MOD-M-02] SpotlightSearch — 포커스 트랩 미적용
- **현상**: `SpotlightSearch.tsx:101-106`에서 `role="dialog" aria-modal="true"`는 있으나, `useFocusTrap` 미사용. 검색 입력에 `inputRef.focus()`로 초기 포커스는 이동하지만, Tab 키로 모달 외부 요소에 도달 가능
- **위치**: `frontend/src/components/market/SpotlightSearch.tsx:101-106`
- **영향**: Spotlight 검색 중 Tab으로 배경 요소에 포커스 이동 가능
- **권장**: `useFocusTrap` 적용하여 검색 입력 + ESC 버튼 + 결과 목록 내에서만 포커스 순환
- **심각도**: Medium

---

## H. 기타 — 2건

### [ETC-M-01] UserProfileModal — useFocusTrap 미적용
- **현상**: `UserProfileModal.tsx:82-99`에서 ESC 닫기와 `useScrollLock`, 모달 열릴 때 `modalRef.current.focus()`는 적용되어 있으나, `useFocusTrap` 훅이 사용되지 않음. 모달 내부의 팔로우/카피트레이딩/닫기 버튼 사이에서만 포커스가 순환되어야 하지만, Tab으로 외부 이탈 가능. `role="dialog"` 속성도 없음
- **위치**: `frontend/src/components/leaderboard/UserProfileModal.tsx:82-99`
- **영향**: 키보드 포커스 트랩 부재, 스크린 리더 모달 인식 불가
- **권장**: `role="dialog" aria-modal="true"` 추가, `useFocusTrap` 적용
- **심각도**: Medium

### [ETC-L-01] 이미지 — 전체 프로젝트 내 img 요소 2개만 존재하며 모두 alt 적용
- **현상**: 프로젝트 전체에서 `<img>` 태그는 `page.tsx:135`(`alt={tech.name + ' logo'}`)와 `Footer.tsx:168`(`alt={tech.name}`)에만 존재. 모두 적절한 alt 텍스트가 적용됨. 단, 커뮤니티 게시글 본문에서 DOMPurify로 `<img>` 태그를 의도적으로 제거(보안 이유)하여 사용자 업로드 이미지에 대한 alt 텍스트 기회 자체가 차단됨
- **위치**: `frontend/src/app/page.tsx:135`, `frontend/src/components/layout/Footer.tsx:168`
- **영향**: 현재는 문제 없으나, 향후 이미지 기능 추가 시 alt 텍스트 가이드라인 필요
- **권장**: 이미지 업로드 기능 추가 시 반드시 alt 텍스트 입력 필드 포함하는 가이드라인 수립
- **심각도**: Low

---

## 종합 평가

5차 UX 감사에서 총 **34건**의 이슈를 발견하였습니다. 4차에서 지적된 18건 중 **17건이 미수정, 1건이 부분 수정**되어 이전 감사 대비 개선 속도가 매우 느린 상황입니다.

### 5차 감사에서 새로 발견된 주요 이슈 (엄격 기준 적용):

1. **Skip Navigation 링크 부재** (A11Y-H-01) — WCAG 2.1 2.4.1 위반, 키보드 사용자 페이지 탐색 근본적 장애
2. **전역 버튼 포커스 링 부재** (A11Y-H-02) — WCAG 2.1 2.4.7 위반, Button 컴포넌트에 focus-visible 스타일 미적용
3. **CopyTradeModal ARIA/포커스 트랩 부재** (MOD-H-01) — 유일하게 role="dialog"와 useFocusTrap이 모두 없는 모달
4. **토스트 알림 aria-live 부재** (A11Y-M-02) — 스크린 리더가 토스트 내용을 읽지 못함
5. **채팅방 퇴장 네이티브 confirm() 사용** (A11Y-M-04) — 3개 컴포넌트에서 디자인 시스템 미사용
6. **뉴스 AI 모달/SpotlightSearch 포커스 트랩 누락** (MOD-M-01, MOD-M-02) — 다른 모달에는 적용되어 있어 불일관
7. **회원가입 비밀번호 토글 미구현** (FRM-M-03) — 로그인에는 있으나 회원가입에 없는 불일관

### 4차 대비 미수정으로 심각도 상향된 이슈:

- **비밀번호 변경 토글 미구현** (FRM-H-01) — 3차부터 지적, 3회 연속 미수정으로 Medium→High 상향
- **리더보드 필터 영역 320px 오버플로우** (RD-H-01) — 5차 320px 기준 적용으로 Low→High 상향

### 긍정적 사항:

- **대부분의 모달**에 ESC 닫기, useScrollLock, useFocusTrap, role="dialog", aria-modal="true" 일관 적용 (ConfirmModal, BottomSheet, ContentModal, LoginRequiredModal, OrderSheet, PriceAlertModal)
- **BottomSheet**에 첫 번째 input 자동 포커스 구현
- **로그인 페이지**에 비밀번호 토글, 첫 입력 필드 자동 포커스, 로딩 상태 버튼 모두 구현
- **404 페이지** i18n 지원 및 홈 링크 제공
- **이미지** alt 텍스트 전수 적용 (2개 img 태그 모두)
- **대시보드** tablist ARIA 속성 완전 적용

### 우선 수정 권장 순서:

1. **High** — Skip Navigation 추가, Button 포커스 링 추가, 비밀번호 변경 토글, CopyTradeModal ARIA 추가, 리더보드 필터 320px 대응
2. **Medium** — Tabs 공통 컴포넌트 ARIA 일괄 적용, 토스트 aria-live, 포커스 트랩 누락 모달 3건, confirm() → ConfirmModal 교체, BottomSheet 입력값 초기화
3. **Low** — 스켈레톤 개선, 빈 상태 UI 개선, 관심종목 버튼 aria-label 등
