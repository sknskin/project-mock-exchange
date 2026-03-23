# VirtuEx 사용자 UX 개선 감사 보고서 (6차)

**VirtuEx User Experience Improvement Audit Report (6th)**

- 감사일: 2026-03-23
- 감사 범위: 모바일 반응형(320px 기준), 접근성(ARIA/포커스/대비), 폼/입력 UX, 로딩/에러 상태, 네비게이션 흐름, 정보 구조, 모달/다이얼로그, 토스트 접근성, 테이블 반응형, 스켈레톤/스피너, 파괴적 동작 확인, 이미지 alt 텍스트, 간격/패딩 일관성
- 감사 방법: 소스 코드 직접 분석 (page.tsx, component.tsx 전체), WCAG 2.1 AA 기준 대조, 320px 뷰포트 기준 반응형 클래스 검사, ARIA 속성 및 포커스 관리 검증
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 5차 대비 수정 현황을 검증하고, 동일 기준으로 잔존 이슈 및 신규 이슈를 기록함

---

## 이전 감사 대비 수정 현황 (5차 → 6차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [A11Y-H-01] Skip Navigation 링크 부재 | **수정 완료** | `layout.tsx:75-81`에 `<a href="#main-content" className="sr-only focus:not-sr-only ...">` 추가, `MainContent.tsx:24`에 `id="main-content"` 부여. WCAG 2.4.1 충족 |
| [A11Y-H-02] 전역 버튼 포커스 링 부재 | **수정 완료** | `Button.tsx:36` base 클래스에 `focus:ring-2 focus:ring-accent/50 focus:ring-offset-1 focus:outline-none` 추가. WCAG 2.4.7 충족 |
| [FRM-H-01] 비밀번호 변경 모달 토글 미구현 (3회 연속 미수정) | **수정 완료** | `mypage/page.tsx:694-767`에 Eye/EyeOff 토글 3개 필드 모두 적용, 각 토글 버튼에 `tabIndex={-1}` 및 상태별 `type` 전환 구현 |
| [FRM-M-03] 회원가입 비밀번호 토글 미구현 | **수정 완료** | `register/page.tsx:58-59`에 `showPassword`/`showPasswordConfirm` 상태 추가, Eye/EyeOff 토글 + `aria-label` 적용 |
| [MOD-H-01] CopyTradeModal ARIA/포커스 트랩 부재 | **수정 완료** | `CopyTradeModal.tsx:167-169`에 `role="dialog" aria-modal="true" aria-labelledby` 추가, 수동 포커스 트랩(`handleKeyDown` + `querySelectorAll` 포커스 순환) 구현 |
| [RD-H-01] 리더보드 필터 영역 320px 오버플로우 | **수정 완료** | `leaderboard/page.tsx:306`에 `overflow-x-auto scrollbar-hide` 추가, 기간/정렬 탭 버튼에 `min-h-[44px] min-w-[44px]` 터치 타겟 보장, `flex-wrap` 유지 |
| [A11Y-M-01] 탭 UI ARIA 역할 미적용 | **부분 수정** | `Tabs.tsx` 공통 컴포넌트에 `role="tablist"`, `role="tab"`, `aria-selected` 일괄 적용 완료. 그러나 Tabs 컴포넌트를 사용하지 않는 인라인 탭(커뮤니티, 주문, 포트폴리오, 뉴스, 리더보드)에는 여전히 ARIA 역할 미적용. `role="tabpanel"`도 미구현 |
| [A11Y-M-02] 토스트 알림 aria-live 부재 | **수정 완료** | `ToastContainer.tsx:41-42`에 `role="status" aria-live="polite"` 추가, `LiveToastContainer.tsx:84-85`에도 동일 적용 |
| [A11Y-M-04] 채팅방 퇴장 네이티브 confirm() → ConfirmModal | **수정 완료** | `RoomList.tsx:319-322`, `ChatPanel.tsx:247-249`, `PinnedChatPanel.tsx:70-72` 모두 `ConfirmModal` 컴포넌트로 교체 완료 |
| [RD-M-01] OrderForm 모바일 전용 높이/패딩 미적용 | **미수정** | 가격/수량 Input(`h-12`) 및 주문 버튼(`h-[52px]`)에 모바일 전용 클래스 여전히 없음 |
| [RD-M-02] 종목 상세 고정 매수/매도 바 safe-bottom + pb-8 중복 | **미수정** | `asset/[symbol]/page.tsx:520`에 `safe-bottom px-4 py-3 pb-8` 그대로 유지 |
| [RD-M-03] 주문 분석 탭 24시간 바 차트 320px 가독성 저하 | **미수정** | `orders/page.tsx` 24개 바 + `text-[9px]`/`text-[10px]` 라벨 유지 |
| [RD-L-01] 포트폴리오 Market Pulse 단일 열 그리드 | **미수정** | `grid-cols-1 sm:grid-cols-2` 유지 |
| [RD-L-02] 뉴스 AI 분석 버튼 320px 넘침 | **미수정** | 탭 바 + AI 버튼 동일 행 배치 유지 |
| [A11Y-M-03] RoomList 컨텍스트 메뉴 키보드 접근 불가 | **미수정** | `onContextMenu` 전용, 키보드/터치 대체 수단 없음 |
| [A11Y-L-01] CandlestickChart 지표 토글 비색상 구분 부재 | **미수정** | opacity(1 vs 0.35)만으로 구분 유지 |
| [A11Y-L-02] 관심종목 Star/Bell 버튼 aria-label 누락 | **미수정** | `asset/[symbol]/page.tsx:189-218`에 aria-label 여전히 없음 |
| [FRM-M-01] 입금/출금 BottomSheet 닫기 시 입력값 미초기화 | **미수정** | `onClose={() => setDepositOpen(false)}`에서 금액 상태 초기화 미호출 |
| [FRM-M-02] 주문 수정 취소 시 editPrice/editQuantity 미초기화 | **미수정** | `orders/page.tsx:634`에서 `setEditingOrderId(null)`만 호출 |
| [FRM-L-01] 주문 수정 입력 필드 포커스 링 미적용 | **미수정** | 네이티브 input에 `focus:ring` 클래스 없음 |
| [LD-M-01] AI 분석 에러 유형 미구분 | **미수정** | `setAiError(true)` 단일 처리 유지 |
| [LD-M-02] 뉴스 페이지 로딩 시 비구조화 pulse | **미수정** | `animate-pulse` 단순 직사각형 유지 |
| [LD-L-01] 마이페이지 프로필 로딩 시 텍스트만 표시 | **미수정** | `{t('common.loading')}` 텍스트 유지 |
| [NAV-M-01] 종목 상세 뒤로 가기 하드코딩 | **미수정** | `href="/dashboard"` 하드코딩 유지 |
| [NAV-M-02] 뉴스 검색 활성 필터 상태 피드백 부족 | **미수정** | 결과 건수/필터 초기화 버튼 미제공 |
| [NAV-L-01] 포트폴리오 빈 상태 거래 분석 링크 부재 | **미수정** | 대시보드 링크만 제공 |
| [INF-M-01] 대시보드 AI 분석 범위 정보 미표시 | **미수정** | 모달 헤더에 부가 정보 없음 |
| [INF-M-02] 주문 확인 모달 비구조화 텍스트 | **미수정** | `\n` 연결 형태 유지 |
| [INF-L-01] 리더보드 빈 상태 구분선 불필요 표시 | **미수정** | `divide-y divide-border/40` 내부 배치 유지 |
| [INF-L-02] AssetList 모바일 필터 변경 시 자동 접힘 미구현 | **미수정** | `setMobileFilterOpen(false)` 미호출 유지 |
| [MOD-M-01] 뉴스 AI 분석 모달 포커스 트랩 미적용 | **미수정** | `useFocusTrap` 미사용, 키보드 포커스 외부 이탈 가능 |
| [MOD-M-02] SpotlightSearch 포커스 트랩 미적용 | **미수정** | `useFocusTrap` 미사용, `aria-labelledby`도 없음 |
| [ETC-M-01] UserProfileModal useFocusTrap 미적용 | **미수정** | `role="dialog"` + `aria-label`은 있으나 `useFocusTrap` 없음 |
| [ETC-L-01] 이미지 alt 텍스트 가이드라인 부재 | **미수정** | 현재 img 태그 2개 모두 alt 적용, 가이드라인 수립 미진행 |
| 비밀번호 토글 — forgot-password 페이지 | **수정 완료** (5차 미지적, 별도 확인) | `forgot-password/page.tsx:315, 336`에 Eye/EyeOff 토글 적용 확인 |

**요약:** 5차에서 지적된 34건 중 **8건 완전 수정, 1건 부분 수정, 25건 미수정**.

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 모바일 반응형 | 0 | 0 | 3 | 2 | 5 |
| B. 접근성 (A11Y) | 0 | 0 | 5 | 3 | 8 |
| C. 폼/입력 UX | 0 | 0 | 3 | 1 | 4 |
| D. 로딩/에러 상태 | 0 | 0 | 2 | 1 | 3 |
| E. 네비게이션/흐름 | 0 | 0 | 2 | 1 | 3 |
| F. 정보 구조/표시 | 0 | 0 | 2 | 2 | 4 |
| G. 모달/다이얼로그 | 0 | 0 | 3 | 0 | 3 |
| H. 기타 | 0 | 0 | 0 | 1 | 1 |
| **합계** | **0** | **0** | **20** | **11** | **31** |

---

## A. 모바일 반응형 — 5건

### [RD-M-01] OrderForm — 모바일 전용 높이/패딩 미적용 (4차 부분 수정 이후 변동 없음)
- **현상**: `OrderForm.tsx:247-404`에서 비율 수량 버튼에 반응형 패딩이 추가되었으나, 가격/수량 Input(`h-12`)과 주문 버튼(`h-[52px]`)에는 모바일 전용 클래스가 없음. 320px에서 `space-y-4` 간격만으로 폼 요소가 밀집
- **위치**: `frontend/src/components/trading/OrderForm.tsx:247-404`
- **영향**: 320px 화면에서 주문 입력 시 터치 타겟 간 여백 부족으로 오탭 가능
- **권장**: 모바일에서 `space-y-5` 이상 적용, Input 높이를 모바일에서 48px 이상으로 확대
- **심각도**: Medium

### [RD-M-02] 종목 상세 — 고정 매수/매도 바 safe-bottom + pb-8 중복 (4차 이후 변동 없음)
- **현상**: `asset/[symbol]/page.tsx:520`의 하단 고정 바에 `safe-bottom px-4 py-3 pb-8 lg:bottom-0 bottom-[56px] mb-2`가 적용. `safe-bottom`과 `pb-8`이 중복되어 iPhone 노치 기기에서 과도한 하단 여백 발생
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:520`
- **영향**: 일부 기기에서 매수/매도 버튼이 과도하게 위로 올라가거나 콘텐츠와 겹칠 수 있음
- **권장**: `safe-bottom` 적용 시 `pb-8` 제거, BottomNav 존재 여부에 따라 조건부 bottom offset 적용
- **심각도**: Medium

### [RD-M-03] 주문 분석 탭 — 시간대별 분포 바 차트 320px에서 가독성 저하 (5차 미수정)
- **현상**: `orders/page.tsx:261-300`의 24시간 바 차트가 `flex items-end gap-[3px]`로 배치. 320px에서 24개 바가 각 약 10px 너비, `text-[9px]`/`text-[10px]` 라벨 겹침
- **위치**: `frontend/src/app/(main)/orders/page.tsx:261-300`
- **영향**: 320px 디바이스에서 시간대별 거래 분포 차트 정보 전달 불가
- **권장**: 모바일에서 12시간 단위 그룹핑 또는 가로 스크롤 컨테이너 적용
- **심각도**: Medium

### [RD-L-01] 포트폴리오 Market Pulse — 단일 열 그리드 (4차 이후 변동 없음)
- **현상**: `portfolio/page.tsx:233`의 Market Pulse가 `grid-cols-1 sm:grid-cols-2`로 배치. 보유 종목 10개+ 시 모바일에서 과도한 세로 스크롤
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:233`
- **영향**: 다수 보유 종목 시 모바일에서 과도한 세로 스크롤
- **권장**: 모바일에서 카드 높이를 줄이고 핵심 정보(심볼, 수익률)만 표시하는 컴팩트 레이아웃 적용
- **심각도**: Low

### [RD-L-02] 뉴스 AI 분석 버튼 — 320px에서 탭 바와 동일 행 배치 시 넘침 (5차 미수정)
- **현상**: `news/page.tsx:222-260`에서 AI 분석 버튼(`min-w-[120px]`)이 탭 바와 같은 행에 배치. 320px에서 3개 카테고리 탭 + AI 버튼이 한 줄에 들어가면 텍스트 잘림 또는 가로 스크롤
- **위치**: `frontend/src/app/(main)/news/page.tsx:222-260`
- **영향**: 320px 디바이스에서 AI 분석 버튼 또는 카테고리 탭이 잘릴 수 있음
- **권장**: AI 분석 버튼을 모바일에서 아이콘만 표시하거나 탭 바 아래 별도 행으로 분리
- **심각도**: Low

---

## B. 접근성 (A11Y) — 8건

### [A11Y-M-01] 탭 UI ARIA — 인라인 탭 5개 페이지 여전히 미적용 (5차 부분 수정)
- **현상**: `Tabs.tsx` 공통 컴포넌트에 `role="tablist"`, `role="tab"`, `aria-selected` 적용 완료. 그러나 커뮤니티(`community/page.tsx:179-202`), 주문(`orders/page.tsx`), 포트폴리오(`portfolio/page.tsx`), 뉴스(`news/page.tsx`), 리더보드(`leaderboard/page.tsx:306-323`) 페이지의 인라인 탭에는 ARIA 역할 미적용. 이 페이지들은 `Tabs` 컴포넌트를 사용하지 않고 직접 `<button>` 배열로 탭을 구현
- **위치**: 커뮤니티, 주문, 포트폴리오, 뉴스, 리더보드 각 페이지 탭 영역
- **영향**: 스크린 리더 사용자가 탭 구조를 인식하지 못함, WCAG 2.1 4.1.2 위반
- **권장**: 인라인 탭을 `Tabs` 공통 컴포넌트로 교체하거나, 최소한 `role="tablist"` / `role="tab"` / `aria-selected` 속성을 직접 추가
- **심각도**: Medium

### [A11Y-M-02] Tabs 컴포넌트 — role="tabpanel" 미구현 (신규)
- **현상**: `Tabs.tsx`에 `role="tablist"`와 `role="tab"` + `aria-selected`는 적용되었으나, 탭 패널 영역에 해당하는 `role="tabpanel"` 속성이 프로젝트 전체에서 존재하지 않음. WCAG 탭 패턴에서는 `tablist` → `tab` → `tabpanel` 연결이 완전해야 스크린 리더가 탭과 연결된 콘텐츠 영역을 올바르게 안내
- **위치**: `frontend/src/components/ui/Tabs.tsx` 및 이를 사용하는 모든 페이지
- **영향**: 스크린 리더가 선택된 탭과 연결된 콘텐츠 패널의 관계를 파악하지 못함
- **권장**: `Tabs` 컴포넌트에 `children` 또는 `renderPanel` prop을 추가하여 `role="tabpanel" aria-labelledby="tab-{key}"` 자동 부여, 또는 사용처에서 패널 div에 직접 `role="tabpanel"` 적용
- **심각도**: Medium

### [A11Y-M-03] RoomList 컨텍스트 메뉴 — 키보드 접근 불가 (4차 이후 변동 없음)
- **현상**: `RoomList.tsx:226`의 채팅방 컨텍스트 메뉴가 `onContextMenu`(우클릭)로만 열림. 키보드 사용자나 터치 기기 사용자가 채팅방 이름변경/퇴장 기능에 접근 불가
- **위치**: `frontend/src/components/chat/RoomList.tsx:226`
- **영향**: 키보드 전용 사용자의 채팅방 관리 기능 접근 차단
- **권장**: 더보기(...) 아이콘 버튼 추가 또는 Shift+F10 키바인딩 지원
- **심각도**: Medium

### [A11Y-M-04] SpotlightSearch — aria-labelledby 및 포커스 트랩 부재 (5차 미수정)
- **현상**: `SpotlightSearch.tsx:106`에서 `role="dialog" aria-modal="true"`는 있으나, `aria-labelledby`가 없어 스크린 리더가 모달의 제목을 알 수 없음. `useFocusTrap`도 미적용되어 Tab 키로 모달 외부 요소에 도달 가능
- **위치**: `frontend/src/components/market/SpotlightSearch.tsx:106`
- **영향**: WCAG 2.1 2.4.3 위반, 키보드 포커스 트랩 부재
- **권장**: `aria-labelledby` 추가 (검색 입력란의 placeholder를 `aria-label`로 대체 가능), `useFocusTrap` 적용
- **심각도**: Medium

### [A11Y-M-05] 관심종목 Star/Bell 버튼 — aria-label 누락 (5차 미수정)
- **현상**: `asset/[symbol]/page.tsx:189-218`의 Star(관심종목) 버튼과 Bell(가격 알림) 버튼에 `aria-label`이 없음. 스크린 리더가 버튼 용도를 인식 불가
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:189-218`
- **영향**: 스크린 리더 사용자가 버튼 용도를 인식하지 못함
- **권장**: Star 버튼에 `aria-label={isWatchlisted ? '관심종목 제거' : '관심종목 추가'}`, Bell 버튼에 `aria-label="가격 알림 설정"` 추가
- **심각도**: Medium (5차 Low에서 상향 — 2회 연속 미수정)

### [A11Y-L-01] CandlestickChart 지표 토글 — 비색상 시각 표시 부재 (4차 이후 변동 없음)
- **현상**: `CandlestickChart.tsx:530`의 지표 토글 버튼이 비활성 상태에서 `opacity: 0.35`만으로 구분. 색각 이상 사용자가 활성/비활성 상태를 구분하기 어려움
- **위치**: `frontend/src/components/chart/CandlestickChart.tsx:530`
- **영향**: 색각 이상 사용자의 지표 활성 상태 인식 어려움
- **권장**: 체크마크 아이콘, 테두리 두께 변화 등 비색상 시각 표시 추가
- **심각도**: Low

### [A11Y-L-02] Input 컴포넌트 — label htmlFor 미연결 및 에러 aria-describedby 미적용 (신규)
- **현상**: `Input.tsx:58`에서 `<label>` 요소가 `htmlFor` 속성 없이 텍스트만 표시. input과 label이 별도 요소로 존재하므로 프로그래밍적 연결이 불완전. 또한 에러 메시지(`Input.tsx:75`)에 `id`가 없어 input의 `aria-describedby`로 연결할 수 없음. `aria-invalid`는 적용되어 있으나 에러 메시지와의 연결 없음
- **위치**: `frontend/src/components/ui/Input.tsx:58, 62, 75`
- **영향**: 스크린 리더가 label과 input의 관계를 암시적으로만 추론, 에러 메시지를 자동으로 읽지 않음
- **권장**: `useId()`로 고유 ID 생성 후 `<label htmlFor={id}>`, `<input id={id} aria-describedby={errorId}>`, `<p id={errorId}>` 연결
- **심각도**: Low

### [A11Y-L-03] BottomNav — aria-current="page" 미적용 (신규)
- **현상**: `BottomNav.tsx:23-111`에서 현재 페이지에 해당하는 네비게이션 링크에 시각적 스타일(text-text-primary, strokeWidth 변경)은 적용되나, `aria-current="page"` 속성이 없음. 스크린 리더 사용자가 현재 위치를 알 수 없음
- **위치**: `frontend/src/components/layout/BottomNav.tsx:23-111`
- **영향**: 스크린 리더 사용자가 현재 활성 탭을 인식하지 못함
- **권장**: 활성 링크에 `aria-current="page"` 속성 추가
- **심각도**: Low

---

## C. 폼/입력 UX — 4건

### [FRM-M-01] 입금/출금 BottomSheet — 닫기 시 입력값 미초기화 (4차 이후 변동 없음)
- **현상**: `portfolio/page.tsx:371`의 입금 BottomSheet에서 금액을 입력하다가 시트를 닫으면 입력값이 `depositAmount` 상태에 남아있어 다음 열기 시 이전 값이 표시됨. 출금도 동일
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:371, 425`
- **영향**: 사용자 혼란 — 이전에 입력하다 만 금액이 잔존
- **권장**: BottomSheet `onClose` 콜백에서 `setDepositAmount('')` / `setWithdrawAmount('')` 호출
- **심각도**: Medium

### [FRM-M-02] 주문 수정 취소 시 editPrice/editQuantity 미초기화 (4차 이후 변동 없음)
- **현상**: `orders/page.tsx:634`에서 수정 취소 시 `setEditingOrderId(null)`만 호출. `editPrice`/`editQuantity` 상태가 이전 입력값을 유지
- **위치**: `frontend/src/app/(main)/orders/page.tsx:634`
- **영향**: 같은 주문을 재수정할 때 취소 전 입력값이 초기값으로 나타남
- **권장**: 취소 시 `setEditPrice('')`/`setEditQuantity('')` 동시 호출
- **심각도**: Medium

### [FRM-M-03] 주문 수정 입력 필드 — 포커스 링 및 접근성 미적용 (5차 미수정, 범위 확대)
- **현상**: `orders/page.tsx:610-622`의 주문 수정 inline `<input type="number">`에 `focus:ring` 등 포커스 스타일이 없어 브라우저 기본 스타일에 의존. 또한 `aria-label` 없이 `placeholder`만으로 용도를 안내하여, 스크린 리더가 입력 필드의 목적을 명확히 전달하지 못함
- **위치**: `frontend/src/app/(main)/orders/page.tsx:610-622`
- **영향**: 디자인 시스템과 불일관한 포커스 스타일, 접근성 미흡
- **권장**: Input 컴포넌트 사용 또는 동일한 포커스/접근성 클래스 적용
- **심각도**: Medium (5차 Low에서 상향 — 2회 연속 미수정, 접근성 범위 확대)

### [FRM-L-01] Button 포커스 링 — focus: vs focus-visible: 사용 (신규)
- **현상**: `Button.tsx:36`에서 `focus:ring-2`를 사용. 이는 마우스 클릭 시에도 포커스 링이 표시되어 시각적 노이즈 발생. 업계 관행상 `focus-visible:ring-2`를 사용하여 키보드 탐색 시에만 포커스 링을 표시하는 것이 권장됨. `Input.tsx:67`도 `focus:ring-2` 사용
- **위치**: `frontend/src/components/ui/Button.tsx:36`, `frontend/src/components/ui/Input.tsx:67`
- **영향**: 마우스 사용자가 버튼/입력 클릭 시 불필요한 포커스 링 표시
- **권장**: `focus:ring-2`를 `focus-visible:ring-2`로 변경
- **심각도**: Low

---

## D. 로딩/에러 상태 — 3건

### [LD-M-01] AI 분석 에러 유형 미구분 (4차 이후 변동 없음)
- **현상**: `dashboard/page.tsx:185`과 `news/page.tsx:189`에서 AI 분석 catch 블록이 모든 에러를 `setAiError(true)` 단일 처리. 네트워크 에러, 타임아웃, 서버 500 에러 등 원인별 안내 없음
- **위치**: `frontend/src/app/(main)/dashboard/page.tsx:185`, `frontend/src/app/(main)/news/page.tsx:189`
- **영향**: 사용자가 60초 대기 후 "오류 발생"만 표시되어 재시도 가능 여부 판단 불가
- **권장**: 에러 유형별 메시지 분기 (timeout → "시간 초과", 503 → "AI 서비스 일시 불가" 등)
- **심각도**: Medium

### [LD-M-02] 뉴스 페이지 — 로딩 시 스켈레톤 대신 pulse 애니메이션만 사용 (5차 미수정)
- **현상**: `news/page.tsx:289`에서 로딩 시 `<div className="h-24 rounded-xl bg-bg-secondary animate-pulse" />`만 표시. 뉴스 카드 구조를 반영하는 스켈레톤이 아닌 단순 직사각형
- **위치**: `frontend/src/app/(main)/news/page.tsx:289`
- **영향**: 뉴스 페이지만 비구조화된 로딩 표시, CLS 증가
- **권장**: 뉴스 카드 구조를 반영하는 스켈레톤 컴포넌트 적용
- **심각도**: Medium

### [LD-L-01] 마이페이지 — 프로필 로딩 시 텍스트만 표시 (5차 미수정)
- **현상**: `mypage/page.tsx:296-298`에서 로딩 상태가 `{t('common.loading')}` 텍스트만 표시. 8개 카드 구조를 반영하는 스켈레톤 없이 단순 텍스트
- **위치**: `frontend/src/app/(main)/mypage/page.tsx:296-298`
- **영향**: 프로필 로딩 시 빈 화면에 "로딩 중" 텍스트만 표시되어 CLS 발생
- **권장**: 카드 그리드 구조를 반영하는 스켈레톤 레이아웃 적용
- **심각도**: Low

---

## E. 네비게이션/흐름 — 3건

### [NAV-M-01] 종목 상세 뒤로 가기 — 하드코딩 경로 (4차 이후 변동 없음)
- **현상**: `asset/[symbol]/page.tsx:181`의 뒤로 가기 링크가 `href="/dashboard"`로 하드코딩. 커뮤니티, 포트폴리오, 검색, 리더보드, 뉴스 등 다양한 진입 경로에서 접근 가능하나 항상 대시보드로 복귀
- **위치**: `frontend/src/app/(main)/asset/[symbol]/page.tsx:181`
- **영향**: 포트폴리오에서 종목 상세 진입 후 뒤로 가기 시 대시보드로 이동, 사용자 흐름 단절
- **권장**: `router.back()` 사용 또는 `useSearchParams`로 referrer 경로 저장
- **심각도**: Medium

### [NAV-M-02] 뉴스 검색 — 활성 필터 상태 시각적 피드백 부족 (4차 이후 변동 없음)
- **현상**: `news/page.tsx`에서 검색어와 날짜 필터가 동시 적용되어도 결과 건수 또는 필터 초기화 버튼이 없음. 기본 필터가 '24h'로 설정되어 있어 사용자가 인지하지 못할 수 있음
- **위치**: `frontend/src/app/(main)/news/page.tsx:56, 121-132`
- **영향**: 사용자가 필터 상태를 인지하지 못하고 뉴스가 적다고 오해
- **권장**: 활성 필터 수 뱃지, "N건 결과" 카운터, 전체 필터 초기화 버튼 제공
- **심각도**: Medium

### [NAV-L-01] 포트폴리오 빈 상태 — 거래 분석 링크 부재 (4차 이후 변동 없음)
- **현상**: `portfolio/page.tsx:332-344`에서 보유 종목이 없을 때 대시보드 링크만 제공. 거래 내역이 있는데 현재 보유 종목 0인 경우 거래 분석 탭으로의 안내 부재
- **위치**: `frontend/src/app/(main)/portfolio/page.tsx:332-344`
- **영향**: 전량 매도 후 사용자가 거래 기록을 확인하려면 별도로 탭 전환 필요
- **권장**: "거래 분석 보기" 링크 추가
- **심각도**: Low

---

## F. 정보 구조/표시 — 4건

### [INF-M-01] 대시보드 AI 분석 — 분석 범위 정보 미표시 (4차 이후 변동 없음)
- **현상**: 대시보드 AI 분석 모달에서 "AI 시장 분석" 타이틀만 표시. 분석에 사용된 뉴스 건수, 분석 시간대, 분석 완료 시각 정보가 없음
- **위치**: `frontend/src/app/(main)/dashboard/page.tsx:425-512` (또는 `DashboardAiModal.tsx`)
- **영향**: 사용자가 분석의 범위와 시점을 알 수 없어 신뢰도 판단 어려움
- **권장**: 모달 헤더에 "최근 24시간 / N건 뉴스 기반" 부가 정보 표시
- **심각도**: Medium

### [INF-M-02] 주문 확인 모달 — 비구조화 텍스트 나열 (4차 이후 변동 없음)
- **현상**: `OrderForm.tsx:400`의 주문 확인 모달 message가 `\n` 문자열 연결로 구성. 가격, 수량, 총액이 단순 텍스트로 나열
- **위치**: `frontend/src/components/trading/OrderForm.tsx:400`
- **영향**: 주문 실행 전 최종 확인 단계에서 핵심 정보 파악 어려움, 오주문 위험
- **권장**: ConfirmModal에 구조화된 레이아웃(label-value 쌍) 적용
- **심각도**: Medium

### [INF-L-01] 리더보드 빈 상태 — 구분선 불필요 표시 (4차 이후 변동 없음)
- **현상**: `leaderboard/page.tsx:620`의 빈 상태 메시지가 `divide-y divide-border/40`(`:470`) 목록 div 내부에 위치하여 테이블 헤더와 빈 메시지 사이에 불필요한 구분선 표시
- **위치**: `frontend/src/app/(main)/leaderboard/page.tsx:470, 620`
- **영향**: 시각적 비일관성
- **권장**: 빈 상태를 목록 div 외부로 이동
- **심각도**: Low

### [INF-L-02] AssetList 모바일 필터 — 변경 시 자동 접힘 미구현 (4차 이후 변동 없음)
- **현상**: `AssetList.tsx`에서 모바일 필터 드롭다운이 펼쳐진 상태에서 카테고리/정렬/기간을 변경해도 드롭다운이 자동으로 접히지 않음
- **위치**: `frontend/src/components/market/AssetList.tsx`
- **영향**: 모바일에서 필터 변경 후 드롭다운이 화면 공간을 계속 차지
- **권장**: 필터 변경 핸들러에서 `setMobileFilterOpen(false)` 자동 호출
- **심각도**: Low

---

## G. 모달/다이얼로그 — 3건

### [MOD-M-01] 뉴스 AI 분석 모달 — 포커스 트랩 미적용 (5차 미수정)
- **현상**: `news/page.tsx:357`의 AI 분석 모달에 `role="dialog" aria-modal="true" aria-labelledby`는 적용되어 있으나, `useFocusTrap`이 미적용. 대시보드 AI 분석 모달(`DashboardAiModal.tsx`)에는 `useFocusTrap`이 적용되어 있어 불일관
- **위치**: `frontend/src/app/(main)/news/page.tsx:357`
- **영향**: 뉴스 AI 분석 모달에서 Tab 키로 모달 외부 요소에 도달 가능
- **권장**: `useRef` + `useFocusTrap` 패턴을 대시보드 AI 모달과 동일하게 적용
- **심각도**: Medium

### [MOD-M-02] MarketIndexModal — 포커스 트랩 미적용 (신규)
- **현상**: `MarketIndexModal.tsx:175-177`에 `role="dialog" aria-modal="true" aria-labelledby` 모두 적용되어 있으나, `useFocusTrap`이 미사용. 닫기 버튼, 카테고리 탭, 스크롤 영역이 포함된 모달에서 Tab 키로 외부 이탈 가능
- **위치**: `frontend/src/components/market/MarketIndexModal.tsx:175-177`
- **영향**: 키보드 사용자가 모달 외부로 포커스 이탈
- **권장**: `useFocusTrap` 훅 적용
- **심각도**: Medium

### [MOD-M-03] UserProfileModal — 포커스 트랩 미적용 (5차 미수정)
- **현상**: `UserProfileModal.tsx:119-121`에 `role="dialog"` + `aria-label`은 있으나, `useFocusTrap`이 미적용. 팔로우/카피트레이딩/닫기 버튼 사이에서만 포커스가 순환되어야 하지만 Tab으로 외부 이탈 가능
- **위치**: `frontend/src/components/leaderboard/UserProfileModal.tsx:119-121`
- **영향**: 키보드 포커스 트랩 부재
- **권장**: `useFocusTrap` 적용
- **심각도**: Medium

---

## H. 기타 — 1건

### [ETC-L-01] 이미지 alt 텍스트 가이드라인 부재 (5차 미수정)
- **현상**: 프로젝트 전체에서 `<img>` 태그 2개 모두 적절한 alt 텍스트 적용. 그러나 향후 이미지 기능 추가 시 alt 텍스트 가이드라인이 미수립
- **위치**: `frontend/src/app/page.tsx`, `frontend/src/components/layout/Footer.tsx`
- **영향**: 현재는 문제 없으나, 향후 이미지 기능 추가 시 접근성 위반 가능
- **권장**: 이미지 업로드 기능 추가 시 반드시 alt 텍스트 입력 필드 포함하는 가이드라인 수립
- **심각도**: Low

---

## 종합 평가

6차 UX 감사에서 총 **31건**의 이슈를 발견하였습니다. 5차에서 지적된 34건 중 **8건이 완전 수정, 1건이 부분 수정, 25건이 미수정**되었습니다. 5차 대비 3건이 감소하였으나, 이는 수정된 8건에서 신규 4건이 추가된 결과입니다.

### 6차에서 수정 확인된 주요 항목:

1. **Skip Navigation 링크 추가** (A11Y-H-01) — `layout.tsx`에 `sr-only focus:not-sr-only` 패턴으로 구현, `MainContent.tsx`에 `id="main-content"` 타겟 적용. WCAG 2.4.1 충족
2. **Button 포커스 링 추가** (A11Y-H-02) — `Button.tsx` base 클래스에 `focus:ring-2 focus:ring-accent/50` 추가. WCAG 2.4.7 충족
3. **비밀번호 토글 전면 적용** (FRM-H-01, FRM-M-03) — 마이페이지 3개 필드, 회원가입 2개 필드, 비밀번호 찾기 2개 필드 모두 Eye/EyeOff 토글 구현. 로그인 페이지와 UX 일관성 확보
4. **CopyTradeModal ARIA + 포커스 트랩** (MOD-H-01) — `role="dialog" aria-modal="true" aria-labelledby` 추가, 수동 포커스 트랩(Tab/Shift+Tab 순환) 구현
5. **리더보드 필터 영역 개선** (RD-H-01) — `overflow-x-auto` 가로 스크롤, 터치 타겟 `min-h-[44px] min-w-[44px]` 보장
6. **Tabs 공통 컴포넌트 ARIA** (A11Y-M-01 부분) — `role="tablist"`, `role="tab"`, `aria-selected` 일괄 적용
7. **토스트 aria-live 추가** (A11Y-M-02) — `ToastContainer.tsx`, `LiveToastContainer.tsx` 모두 `role="status" aria-live="polite"` 적용
8. **채팅방 confirm() → ConfirmModal** (A11Y-M-04) — 3개 컴포넌트 모두 ConfirmModal로 교체, 디자인 시스템 일관성 확보

### 6차에서 신규 발견된 이슈 (4건):

1. **Tabs role="tabpanel" 미구현** (A11Y-M-02) — tablist/tab 적용은 완료되었으나 tabpanel 연결 누락
2. **Input label htmlFor 미연결** (A11Y-L-02) — 프로그래밍적 label-input 연결 불완전
3. **BottomNav aria-current 미적용** (A11Y-L-03) — 현재 페이지 탭의 스크린 리더 인식 불가
4. **MarketIndexModal 포커스 트랩 미적용** (MOD-M-02) — ARIA 속성은 있으나 useFocusTrap 누락

### 긍정적 사항:

- **5차 High 이슈 5건 중 5건 모두 해결** — High 등급 잔존 이슈 0건으로 감소
- **비밀번호 토글 프로젝트 전체 일관 적용** — 로그인, 회원가입, 비밀번호 찾기, 마이페이지 4개 페이지 모두 Eye/EyeOff 토글 구현
- **CopyTradeModal** — `useFocusTrap` 훅 대신 수동 구현이지만 동등한 포커스 트랩 기능 확보
- **리더보드 필터** — 320px 대응 + 44px 터치 타겟 보장으로 모바일 UX 개선
- **기존 접근성 인프라 유지** — 모든 `role="dialog"` 모달의 ESC 닫기, useScrollLock 일관 적용, 대시보드 tablist ARIA 유지

### 우선 수정 권장 순서:

1. **Medium (빠른 수정 가능)** — 인라인 탭 ARIA 적용 (5개 페이지), tabpanel 추가, 포커스 트랩 누락 모달 3건(뉴스 AI, MarketIndex, UserProfile), SpotlightSearch aria-labelledby, Star/Bell aria-label
2. **Medium (기능 변경 필요)** — BottomSheet 입력값 초기화, 주문 수정 취소 초기화, AI 에러 유형 분기, 종목 상세 뒤로 가기, 뉴스 필터 피드백
3. **Medium (UI 개선)** — OrderForm 모바일 높이, safe-bottom 중복, 주문 바 차트 320px, 주문 확인 구조화, 뉴스 스켈레톤
4. **Low** — focus: → focus-visible:, label htmlFor, aria-current, 스켈레톤, 빈 상태 UI 등
