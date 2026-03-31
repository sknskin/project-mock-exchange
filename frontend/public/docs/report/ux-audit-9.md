# VirtuEx 사용자 UX 개선 감사 보고서 (9차)

**VirtuEx User Experience Improvement Audit Report (9th)**

- 감사일: 2026-03-31
- 감사 범위: 접근성(a11y), 모바일 반응형, 로딩 상태, 네비게이션, 폼/입력 UX, 모달/오버레이, 데이터 표시, 피드백, 국제화(i18n), 시각적 일관성
- 감사 방법: 프론트엔드 전체 소스 코드 직접 분석 — `(main)/**/page.tsx`, `(auth)/**/page.tsx`, `components/**/*.tsx`, `globals.css`, `i18n.ts` 전수 검사
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 8차 대비 잔여 이슈를 확인하고, 전체 프로젝트에 대한 신규 UX 감사를 수행합니다

---

## 1. 접근성 (Accessibility / a11y)

### UX-9-01 | 리더보드 페이지 Trophy 아이콘 aria-hidden 누락
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/leaderboard/page.tsx` (Line 328)
- **설명**: 리더보드 페이지 헤더의 Trophy 아이콘에 `aria-hidden="true"` 속성이 누락되어 있습니다. 다른 페이지들(portfolio, orders, community, news)은 모두 장식용 아이콘에 `aria-hidden="true"`를 적용하고 있으나, 리더보드 페이지만 빠져 있습니다.
- **사용자 영향**: 스크린 리더가 장식용 아이콘을 불필요하게 읽어 사용자를 혼란시킬 수 있습니다.
- **권장 수정**: `<Trophy className="w-5 h-5 text-accent" />` → `<Trophy className="w-5 h-5 text-accent" aria-hidden="true" />`

### UX-9-02 | 마이페이지 User 아이콘 aria-hidden 누락
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/mypage/page.tsx` (Line 47)
- **설명**: 마이페이지 헤더의 User 아이콘에 `aria-hidden="true"` 속성이 누락되어 있습니다. 동일 프로젝트의 다른 페이지 헤더 아이콘은 모두 적용되어 있습니다.
- **사용자 영향**: 스크린 리더 일관성이 깨집니다.
- **권장 수정**: `<User className="w-5 h-5 text-accent" />` → `<User className="w-5 h-5 text-accent" aria-hidden="true" />`

### UX-9-03 | 공지사항 페이지 Megaphone 아이콘 aria-hidden 누락
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/announcements/page.tsx` (Line 76)
- **설명**: 공지사항 페이지 헤더의 Megaphone 아이콘에 `aria-hidden="true"` 속성이 누락되어 있습니다.
- **사용자 영향**: 장식용 아이콘이 스크린 리더에 노출됩니다.
- **권장 수정**: `<Megaphone className="w-5 h-5 text-accent" />` → `<Megaphone className="w-5 h-5 text-accent" aria-hidden="true" />`

### UX-9-04 | 리더보드 "(me)" 레이블 하드코딩 — i18n 미적용
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/leaderboard/page.tsx` (Line 576), `frontend/src/components/leaderboard/LeaderboardCard.tsx` (Line 133), `frontend/src/components/leaderboard/UserProfileModal.tsx` (Line 167)
- **설명**: 리더보드에서 현재 사용자를 표시하는 "(me)" 텍스트가 하드코딩되어 있습니다. `i18n.ts`에 `'chat.me': '(me)'` / `'(나)'` 키가 존재함에도 사용하지 않고 있습니다.
- **사용자 영향**: 한국어 사용자가 영어 레이블을 보게 됩니다. 다국어 경험이 불완전합니다.
- **권장 수정**: `(me)` 하드코딩 대신 `t('chat.me')` 또는 전용 번역 키 사용

### UX-9-05 | 커뮤니티 탭 네비게이션 role="tablist"/role="tab" 누락
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/community/page.tsx` (Line 189-213)
- **설명**: 커뮤니티 페이지의 탭 버튼들에 `role="tablist"`, `role="tab"`, `aria-selected` ARIA 속성이 누락되어 있습니다. 다른 페이지(orders, leaderboard, news, portfolio)의 탭은 모두 올바르게 적용되어 있습니다.
- **사용자 영향**: 스크린 리더 사용자가 탭 네비게이션을 인식할 수 없습니다.
- **권장 수정**: 부모 `<div>`에 `role="tablist"`, 각 `<button>`에 `role="tab"` + `aria-selected={tab === item.key}` 추가

### UX-9-06 | 공지사항 검색 입력 필드 라벨 누락
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/announcements/page.tsx` (Line 98-110)
- **설명**: 공지사항 검색 `<input>`에 `aria-label` 또는 연결된 `<label>` 요소가 없습니다. `placeholder`만 설정되어 있어 스크린 리더가 입력 필드의 용도를 전달하지 못합니다.
- **사용자 영향**: 스크린 리더 사용자가 검색 필드를 식별할 수 없습니다.
- **권장 수정**: `aria-label={t('announce.search')}` 속성 추가

### UX-9-07 | 뉴스 검색 입력 필드 aria-label 누락
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/news/page.tsx` (Line 265-271)
- **설명**: 뉴스 페이지 검색 `<input>`에 `aria-label`이 없습니다. `placeholder`는 접근성 라벨로 충분하지 않습니다.
- **사용자 영향**: 공지사항과 동일한 접근성 문제입니다.
- **권장 수정**: `aria-label={t('news.search')}` 속성 추가

### UX-9-08 | 로그인 페이지 비밀번호 토글 aria-label 하드코딩(영어)
- **심각도**: Low
- **파일**: `frontend/src/app/(auth)/login/page.tsx` (Line 131), `frontend/src/app/(auth)/forgot-password/page.tsx` (Line 312, 333)
- **설명**: 비밀번호 표시/숨기기 토글 버튼의 `aria-label`이 `'Hide password'` / `'Show password'`로 영어만 하드코딩되어 있습니다. i18n 번역 키를 사용해야 합니다.
- **사용자 영향**: 한국어 스크린 리더 사용자에게 영어로 안내됩니다.
- **권장 수정**: `aria-label={t('auth.showPassword')}` / `aria-label={t('auth.hidePassword')}` 번역 키 추가 및 사용

---

## 2. 모바일 반응형 (Mobile Responsiveness)

### UX-9-09 | 뉴스 탭 바 + AI 버튼 320px 뷰포트에서 넘침/겹침
- **심각도**: High
- **파일**: `frontend/src/app/(main)/news/page.tsx` (Line 218-259)
- **설명**: 뉴스 탭 3개(암호화폐, 국내주식, 해외주식)와 AI 분석 버튼이 동일한 `flex` 행에 배치되어 있습니다. 320px 뷰포트에서 탭 텍스트와 AI 버튼이 겹치거나 잘립니다. AI 버튼에 `min-w-[120px]`이 설정되어 있어 좁은 화면에서 공간을 과도하게 차지합니다.
- **사용자 영향**: 소형 모바일 기기에서 탭 클릭이 어렵고 AI 버튼이 잘릴 수 있습니다.
- **권장 수정**: 모바일에서는 AI 버튼을 탭 바 아래 별도 행으로 분리하거나, `overflow-x-auto`와 함께 `min-w-[120px]`을 `sm:min-w-[120px]`로 조건부 적용

### UX-9-10 | 페이지네이션 컴포넌트 모바일 넘침
- **심각도**: Medium
- **파일**: `frontend/src/components/ui/Pagination.tsx` (Line 113-171)
- **설명**: 페이지네이션이 `absolute` 위치로 좌측(총 건수), 우측(건씩 보기)을 배치합니다. 320px 화면에서 3개 요소가 겹칠 수 있습니다. 페이지 번호에 `-ml-8` 시각적 조정이 적용되어 모바일에서 좌측 잘림이 발생할 수 있습니다.
- **사용자 영향**: 소형 모바일에서 페이지 번호와 건수/건씩보기 UI가 겹쳐 조작이 어렵습니다.
- **권장 수정**: 모바일에서는 `flex-col` 레이아웃으로 전환하여 총 건수와 건씩 보기를 별도 행으로 분리

### UX-9-11 | Footer 기술 스택 마키 하단 패딩 모바일 과다
- **심각도**: Low
- **파일**: `frontend/src/components/layout/Footer.tsx` (Line 155)
- **설명**: Footer 마키 영역에 `pb-28 md:pb-10`이 적용되어 모바일에서 112px의 과도한 하단 패딩이 발생합니다. BottomNav 높이(56px)를 고려한 것으로 보이나, 시각적으로 빈 공간이 너무 큽니다.
- **사용자 영향**: 모바일에서 불필요한 빈 공간으로 페이지가 길어 보입니다.
- **권장 수정**: `pb-20 md:pb-10`으로 축소 (BottomNav 56px + 여유 24px = 80px 충분)

### UX-9-12 | 마이페이지 편집 페이지 뒤로 가기 버튼 터치 타겟 부족
- **심각도**: Low
- **파일**: `frontend/src/app/(main)/mypage/edit/page.tsx` (Line 90-94)
- **설명**: 뒤로 가기 버튼의 크기가 `w-8 h-8`(32px)로 WCAG 권장 최소 터치 타겟 44px에 미달합니다. 종목 상세 페이지(`asset/[symbol]/page.tsx`)의 뒤로 가기 버튼도 동일한 문제입니다.
- **사용자 영향**: 모바일에서 터치 정확도가 떨어져 사용성이 저하됩니다.
- **권장 수정**: `min-w-[44px] min-h-[44px]` 추가

---

## 3. 로딩 상태 (Loading States)

### UX-9-13 | 마이페이지 로딩 시 스켈레톤 미적용 — 텍스트만 표시
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/mypage/page.tsx` (Line 61-65)
- **설명**: 마이페이지 로딩 시 `{t('common.loading')}` 텍스트만 표시됩니다. 포트폴리오 페이지는 상세한 스켈레톤 UI를 제공하는 반면, 마이페이지는 단순 텍스트 로딩 표시로 UX 일관성이 떨어집니다.
- **사용자 영향**: 로딩 시 레이아웃 시프트가 발생하고, 다른 페이지 대비 완성도가 낮아 보입니다.
- **권장 수정**: 프로필 카드, 비밀번호 섹션, 외형 설정 등의 형태에 맞는 스켈레톤 컴포넌트 추가

### UX-9-14 | 마이페이지 편집 로딩 상태 스켈레톤 미적용
- **심각도**: Low
- **파일**: `frontend/src/app/(main)/mypage/edit/page.tsx` (Line 78-83)
- **설명**: 프로필 편집 페이지도 동일하게 `{t('common.loading')}` 텍스트만 표시합니다.
- **사용자 영향**: 13번과 동일한 레이아웃 시프트 문제입니다.
- **권장 수정**: 입력 필드 형태의 스켈레톤 추가

### UX-9-15 | 리더보드 비어 있을 때 로딩과 빈 상태 구분 모호
- **심각도**: Low
- **파일**: `frontend/src/app/(main)/leaderboard/page.tsx` (Line 670-674)
- **설명**: 리더보드 데이터가 비어 있을 때 `{t('leaderboard.empty')}` 메시지가 표시되지만, 초기 로딩 후 결과가 없는 것인지 필터 결과가 없는 것인지 구분이 어렵습니다.
- **사용자 영향**: "투자 중인 사용자만" 필터를 켰을 때 결과가 없으면 왜 비어 있는지 알기 어렵습니다.
- **권장 수정**: 필터가 활성화된 상태에서 빈 결과일 때는 "필터 조건에 맞는 사용자가 없습니다" 등의 맥락 정보 추가

---

## 4. 네비게이션 (Navigation)

### UX-9-16 | 종목 상세 페이지 router.back() 히스토리 없을 때 예외 처리 부재
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/asset/[symbol]/page.tsx` (Line 189)
- **설명**: 종목 상세 페이지의 뒤로 가기 버튼이 `router.back()`을 사용합니다. URL을 직접 입력하거나 새 탭에서 열었을 경우 히스토리가 없어 브라우저가 빈 페이지를 표시하거나 예상치 못한 위치로 이동할 수 있습니다.
- **사용자 영향**: 딥링크/북마크로 진입한 사용자가 뒤로 가기 시 앱 밖으로 나갈 수 있습니다.
- **권장 수정**: `window.history.length > 1 ? router.back() : router.push('/dashboard')` 패턴 적용

### UX-9-17 | ScrollToTop 컴포넌트 smooth 스크롤이 페이지 전환 시 부자연스러울 수 있음
- **심각도**: Low
- **파일**: `frontend/src/components/layout/ScrollToTop.tsx` (Line 18)
- **설명**: 페이지 전환 시 `behavior: 'smooth'`로 스크롤이 발생합니다. 빠르게 페이지를 전환할 때 이전 스크롤 애니메이션이 완료되기 전에 새로운 콘텐츠가 로드되어 시각적으로 불안정할 수 있습니다.
- **사용자 영향**: 빠른 네비게이션 시 스크롤 애니메이션이 콘텐츠 로드와 충돌하여 화면이 흔들립니다.
- **권장 수정**: 페이지 전환 시에는 `behavior: 'instant'`로, 탭 전환 등 같은 페이지 내에서만 `behavior: 'smooth'` 사용

---

## 5. 폼 (Forms)

### UX-9-18 | 포트폴리오 입금/출금 금액 MAX 오류 메시지 i18n 미적용
- **심각도**: High
- **파일**: `frontend/src/app/(main)/portfolio/page.tsx` (Line 87-88, 411-412)
- **설명**: 입금 한도 초과 시 오류 메시지가 `'Maximum deposit is $...'` / `'최대 입금 한도는 ...억원입니다'`로 하드코딩되어 있습니다. `currencyMode`에 따라 직접 문자열을 조합하고 있어 i18n 체계를 따르지 않습니다.
- **사용자 영향**: 번역 체계에서 관리되지 않는 메시지가 표시되어, 다국어 전환 시 영어/한국어가 혼재될 수 있습니다.
- **권장 수정**: `t('portfolio.maxDeposit', { amount: '...' })` 형태의 번역 키 추가 및 사용

### UX-9-19 | 비밀번호 찾기 3단계 — 비밀번호 강도 피드백 부재
- **심각도**: Medium
- **파일**: `frontend/src/app/(auth)/forgot-password/page.tsx` (Line 294-346)
- **설명**: 비밀번호 재설정(3단계)에서 새 비밀번호 입력 시 유효성 검사가 `newPassword.length < 8`만 확인합니다. 반면 회원가입 페이지(`register/page.tsx`)는 `validatePassword()`로 대문자, 특수문자, 숫자 포함 여부를 실시간으로 피드백합니다.
- **사용자 영향**: 사용자가 약한 비밀번호를 설정할 수 있으며, 제출 후에야 오류를 확인할 수 있습니다.
- **권장 수정**: 회원가입과 동일한 `ValidationFeedback` 컴포넌트와 `validatePassword()` 적용

### UX-9-20 | 마이페이지 편집 — 폼 제출 로딩 상태 표시 부재
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/mypage/edit/page.tsx` (Line 65-73)
- **설명**: 프로필 수정 저장 시 `updateProfile.mutateAsync(form)`을 호출하지만, 저장 버튼에 로딩 상태(spinner, disabled)가 표시되지 않습니다. `updateProfile.isPending` 상태를 활용하지 않고 있습니다.
- **사용자 영향**: 저장 중 사용자가 버튼을 여러 번 클릭하여 중복 요청이 발생할 수 있습니다.
- **권장 수정**: 저장 버튼에 `disabled={updateProfile.isPending}` + 로딩 텍스트 표시

---

## 6. 모달/오버레이 (Modals & Overlays)

### UX-9-21 | 사용자 드롭다운 메뉴(Header) 닫기 애니메이션 부재
- **심각도**: Low
- **파일**: `frontend/src/components/layout/Header.tsx` (Line 255-345)
- **설명**: 헤더의 사용자 드롭다운 메뉴(`userMenuOpen && (...)`)가 조건부 렌더링으로 즉시 사라집니다. 열림 시에는 별도 애니메이션이 없으며, 닫힘 시에도 마찬가지입니다. ConfirmModal, BottomSheet 등 다른 오버레이는 모두 닫기 애니메이션이 적용되어 있습니다.
- **사용자 영향**: 다른 모달 대비 시각적 일관성이 떨어지고, 메뉴가 갑자기 사라지는 느낌을 줍니다.
- **권장 수정**: `animate-dropdown-in` + 닫기 애니메이션(globals.css에 이미 `@keyframes dropdown-in` 정의됨) 적용. 닫기 시 `closing` 상태 + `setTimeout` 패턴(ConfirmModal과 동일) 적용

### UX-9-22 | 모바일 메뉴 백드롭 — 포커스 트랩 미적용
- **심각도**: Medium
- **파일**: `frontend/src/components/layout/Header.tsx` (Line 379-491)
- **설명**: 모바일 사이드 메뉴가 열릴 때 `useFocusTrap`이 적용되지 않습니다. ConfirmModal, BottomSheet, ContentModal 등 다른 오버레이는 모두 `useFocusTrap`을 사용하고 있습니다.
- **사용자 영향**: 키보드 사용자가 Tab 키로 메뉴 바깥의 요소에 포커스를 이동시킬 수 있어 접근성 기준에 미달합니다.
- **권장 수정**: 모바일 메뉴 컨테이너에 `ref` 추가 후 `useFocusTrap(ref, mobileMenuOpen)` 적용

### UX-9-23 | ConfirmModal aria-labelledby ID 충돌 가능성
- **심각도**: Low
- **파일**: `frontend/src/components/ui/ConfirmModal.tsx` (Line 88, 94)
- **설명**: ConfirmModal의 `aria-labelledby="confirm-modal-title"`과 제목 요소의 `id="confirm-modal-title"`이 정적 ID를 사용합니다. 동일 페이지에 여러 ConfirmModal이 렌더링될 경우(예: 주문 페이지에서 취소 모달 + 로그아웃 모달) ID가 충돌합니다.
- **사용자 영향**: 접근성 트리에서 잘못된 레이블이 참조될 수 있습니다.
- **권장 수정**: `useId()` 훅으로 고유 ID 생성 (Input 컴포넌트와 동일한 패턴)

---

## 7. 데이터 표시 (Data Display)

### UX-9-24 | 공지사항 날짜 포맷 locale 미반영
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/announcements/page.tsx` (Line 178)
- **설명**: 공지사항 목록에서 날짜를 `new Date(item.createdAt).toLocaleDateString()`로 포맷하며, locale 인자를 전달하지 않습니다. 뉴스 페이지는 `dateLocale`(ko-KR/en-US)을 명시적으로 전달하여 일관된 포맷을 제공합니다.
- **사용자 영향**: 브라우저 기본 locale에 따라 날짜 포맷이 달라져 사용자 간 일관성이 깨집니다.
- **권장 수정**: `toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })` 적용

### UX-9-25 | 커뮤니티 게시글 상세 — 카테고리 라벨 인라인 하드코딩
- **심각도**: Medium
- **파일**: `frontend/src/app/(main)/community/[id]/page.tsx` (Line 48-55), `frontend/src/app/(main)/community/new/page.tsx` (Line 26-31)
- **설명**: 커뮤니티 카테고리(`FREE`, `INFO`, `QUESTION` 등)의 한/영 라벨이 각 파일에 `CATEGORIES` 객체로 중복 하드코딩되어 있습니다. i18n 체계를 따르지 않으며, 카테고리 추가/변경 시 여러 파일을 수정해야 합니다.
- **사용자 영향**: 번역 관리가 분산되어 불일치가 발생할 수 있으며, locale 전환 시 올바른 언어가 표시되지 않을 가능성이 있습니다.
- **권장 수정**: `i18n.ts`에 `community.category.FREE` 등의 번역 키 추가 후 `t()` 호출로 통합

### UX-9-26 | 커뮤니티 게시글 상세 브레드크럼에 인라인 locale 분기
- **심각도**: Low
- **파일**: `frontend/src/app/(main)/community/[id]/page.tsx` (Line 333)
- **설명**: 브레드크럼에서 `{t('community.discussions')} {locale === 'ko' ? '상세' : 'Detail'}`로 locale을 인라인 분기하고 있습니다. i18n 번역 키를 사용하지 않는 패턴입니다.
- **사용자 영향**: 번역 관리 누락 위험이 있으며, 새 locale 추가 시 코드 수정이 필요합니다.
- **권장 수정**: `t('community.discussionDetail')` 번역 키 추가

---

## 8. 피드백 (Feedback)

### UX-9-27 | ToastContainer success 타입 색상이 info와 동일
- **심각도**: Medium
- **파일**: `frontend/src/components/ui/ToastContainer.tsx` (Line 16-21)
- **설명**: `STYLE_MAP`에서 `success`와 `info` 타입의 스타일이 `'border-blue-500/40 bg-blue-500/10 text-blue-400'`로 완전히 동일합니다. 사용자가 성공 알림과 정보 알림을 시각적으로 구분할 수 없습니다.
- **사용자 영향**: 입금 성공, 주문 취소 성공 등의 중요한 성공 피드백이 일반 정보와 구분되지 않습니다.
- **권장 수정**: `success` 타입에 `'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'` 또는 기존 `--color-success`(#00BFA5) 색상 체계 적용

### UX-9-28 | 주문 수정(OrderTable) 성공 시 인라인 피드백 부재
- **심각도**: Low
- **파일**: `frontend/src/app/(main)/orders/page.tsx` (Line 88-99)
- **설명**: 주문 수정 성공 시 토스트 알림은 표시되지만, 수정된 주문 행에 시각적 하이라이트(플래시, 배경색 변화)가 없습니다. 사용자가 어떤 주문이 수정되었는지 즉시 확인하기 어렵습니다.
- **사용자 영향**: 여러 주문이 있을 때 수정된 항목을 찾기 어렵습니다.
- **권장 수정**: 수정 완료 후 해당 행에 `tick-flash-rise` 등의 하이라이트 애니메이션 적용

---

## 9. 국제화 (Internationalization / i18n)

### UX-9-29 | global-error.tsx에 한/영 텍스트 인라인 하드코딩
- **심각도**: Low
- **파일**: `frontend/src/app/global-error.tsx` (Line 15-29)
- **설명**: 글로벌 에러 페이지에서 한/영 텍스트가 컴포넌트 내부에 `texts` 객체로 하드코딩되어 있습니다. 이는 i18n.ts 번역 체계와 분리된 별도의 번역 관리입니다. 단, 이 컴포넌트는 루트 레이아웃 자체가 깨졌을 때 표시되므로 독립적인 번역이 불가피한 측면이 있습니다.
- **사용자 영향**: 직접적 문제는 없으나, 번역 변경 시 이 파일을 별도로 관리해야 합니다.
- **권장 수정**: 현재 구조는 의도적인 것으로 판단되나, 주석으로 "의도적으로 i18n.ts와 분리됨 — 루트 에러 시 i18n 모듈 사용 불가" 명시 권장

### UX-9-30 | 포트폴리오 CSV 내보내기 컬럼 헤더 영어 하드코딩
- **심각도**: Low
- **파일**: `frontend/src/app/(main)/portfolio/page.tsx` (Line 313-322)
- **설명**: CSV 내보내기 시 컬럼 헤더(`Symbol`, `Name`, `Quantity`, `Avg Price` 등)가 영어로 하드코딩되어 있습니다.
- **사용자 영향**: 한국어 사용자가 내보낸 CSV의 헤더가 영어로 표시됩니다.
- **권장 수정**: `t('export.column.symbol')` 등의 번역 키 적용

### UX-9-31 | 뉴스 검색 Clear 버튼 aria-label 영어 하드코딩
- **심각도**: Low
- **파일**: `frontend/src/app/(main)/news/page.tsx` (Line 273)
- **설명**: 검색 초기화 버튼의 `aria-label="Clear search"`가 영어로 하드코딩되어 있습니다.
- **사용자 영향**: 한국어 스크린 리더 사용자에게 영어로 안내됩니다.
- **권장 수정**: `aria-label={t('common.clearSearch')}` 번역 키 사용

---

## 10. 시각적 일관성 (Visual Consistency)

### UX-9-32 | 페이지 헤더 높이 불일치 — 대시보드만 고정 높이 없음
- **심각도**: Low
- **파일**: `frontend/src/app/(main)/dashboard/page.tsx` (전체)
- **설명**: 포트폴리오, 주문, 리더보드, 커뮤니티, 뉴스, 공지사항, 마이페이지 등 대부분의 페이지 헤더에 `h-[88px]` 고정 높이가 적용되어 있으나, 대시보드 페이지에는 별도의 헤더 섹션이 없어 시각적 시작점이 다릅니다. `lastUpdated` 표시가 있을 때는 `pt-2 pb-1`로 미세하게 시작되고, 없을 때는 DashboardMobileSearch부터 시작됩니다.
- **사용자 영향**: 페이지 간 전환 시 콘텐츠 시작 위치가 달라 시각적 일관성이 깨집니다.
- **권장 수정**: 대시보드에도 동일한 `h-[88px]` 헤더 영역 추가 (또는 의도적 차별화라면 문서화)

### UX-9-33 | BottomSheet 닫기 버튼과 OrderSheet 닫기 버튼 스타일 불일치
- **심각도**: Low
- **파일**: `frontend/src/components/ui/BottomSheet.tsx` (Line 113-119), `frontend/src/components/trading/OrderSheet.tsx` (Line 88-93)
- **설명**: BottomSheet의 닫기 버튼은 `text-text-quaternary hover:text-text-primary hover:bg-bg-tertiary`, OrderSheet는 `text-text-quaternary hover:text-text-tertiary` + 배경색 없음. 모두 44px 터치 타겟은 확보되어 있으나 호버 스타일이 다릅니다.
- **사용자 영향**: 시각적 일관성이 미세하게 깨집니다.
- **권장 수정**: 닫기 버튼의 hover 스타일을 `hover:text-text-primary hover:bg-bg-secondary` 등으로 통일

### UX-9-34 | ContentModal 닫기 버튼이 danger 색상 — 다른 모달과 불일치
- **심각도**: Low
- **파일**: `frontend/src/components/ui/ContentModal.tsx` (Line 121-123)
- **설명**: ContentModal의 하단 닫기 버튼이 `bg-danger hover:bg-danger/85`(빨간색) 스타일입니다. 다른 모달(ConfirmModal, LoginRequiredModal)은 확인 버튼에만 danger 색상을 사용하고, 닫기/취소 버튼은 중립 색상을 사용합니다. 마크다운 문서를 보는 ContentModal에서 빨간색 닫기 버튼은 위험 행동을 암시하여 적절하지 않습니다.
- **사용자 영향**: 사용자가 "닫기"를 위험한 행동으로 오인할 수 있습니다.
- **권장 수정**: `bg-accent hover:bg-accent/85`(파란색) 또는 중립 `bg-bg-secondary` 스타일로 변경

### UX-9-35 | 랜딩 페이지 기술 스택 마키 img에 width/height 있으나 Footer 마키에는 없음
- **심각도**: Low
- **파일**: `frontend/src/components/layout/Footer.tsx` (Line 166-169), `frontend/src/app/page.tsx` (Line 135-137)
- **설명**: 랜딩 페이지의 기술 스택 마키 `<img>` 태그에는 `width={20} height={20}` 속성이 있으나, Footer의 동일한 마키에는 없습니다. `width`/`height` 속성 없이 CSS만으로 크기를 지정하면 브라우저가 이미지 로딩 전 레이아웃을 계산하지 못해 CLS(Cumulative Layout Shift)가 발생할 수 있습니다.
- **사용자 영향**: 페이지 로드 시 마키 이미지가 로드되면서 미세한 레이아웃 이동이 발생할 수 있습니다.
- **권장 수정**: Footer 마키 `<img>`에도 `width={20} height={20}` 추가

---

## 종합 평가

### 점수 요약

| 카테고리 | 점수 (10점 만점) | 비고 |
|----------|:---:|------|
| 접근성 (a11y) | 7.5 | ARIA 속성 대부분 적용됨. 일부 아이콘/검색 필드 누락, 하드코딩 aria-label 잔존 |
| 모바일 반응형 | 8.0 | 대부분의 터치 타겟 44px 확보. 뉴스 탭+AI 버튼 320px 넘침, 페이지네이션 겹침 잔존 |
| 로딩 상태 | 8.5 | 대시보드/포트폴리오에 상세 스켈레톤 적용. 마이페이지 계열만 텍스트 로딩 |
| 네비게이션 | 9.0 | 딥링크, URL 파라미터 동기화, 브레드크럼 잘 구현. router.back() 예외 처리만 부족 |
| 폼/입력 UX | 8.0 | Input 컴포넌트 접근성 우수. 비밀번호 재설정 강도 피드백, 편집 저장 로딩 부재 |
| 모달/오버레이 | 8.5 | 포커스 트랩, ESC 닫기, 닫기 애니메이션 대부분 적용. 모바일 메뉴 포커스 트랩 누락 |
| 데이터 표시 | 8.0 | 통화 모드, 상대 시간, locale 날짜 포맷 잘 구현. 카테고리 하드코딩, 날짜 locale 누락 잔존 |
| 피드백 | 8.0 | 토스트, 확인 모달 잘 구현. success/info 색상 미분리 |
| 국제화 (i18n) | 7.5 | 4,300줄 규모의 체계적 번역 파일. 부분적 하드코딩 잔존 (입금 한도, CSV 헤더, aria-label 등) |
| 시각적 일관성 | 8.5 | 테마 전환, 버튼 질감, 애니메이션 체계 우수. 미세한 스타일 불일치 잔존 |

### 전체 UX 점수: **81.5 / 100**

### 발견된 이슈 요약

| 심각도 | 건수 |
|--------|:----:|
| Critical | 0 |
| High | 2 |
| Medium | 15 |
| Low | 18 |
| **합계** | **35** |

### 우선 수정 권장 항목 (High)

1. **UX-9-09**: 뉴스 탭+AI 버튼 320px 넘침 — 소형 모바일에서 조작 불가
2. **UX-9-18**: 입금 한도 오류 메시지 i18n 미적용 — 다국어 전환 시 혼재

### 긍정적 개선사항 (8차 대비)

- 모든 모달(ConfirmModal, ContentModal, LoginRequiredModal, BottomSheet)에 닫기 애니메이션(`ANI-M-04`) 일관 적용 확인
- `useFocusTrap`, `useScrollLock` 훅이 대부분의 오버레이에 적용됨
- `prefers-reduced-motion` 미디어 쿼리로 모든 애니메이션 비활성화 지원
- `focus-visible` 글로벌 스타일로 키보드 접근성 기반 확보
- 페이지 전환 시 `PageTransition` 페이드 애니메이션 적용
- Tabs 컴포넌트에 `role="tablist"` / `role="tab"` / `aria-selected` 체계적 적용
- Input 컴포넌트에 `useId()` 기반 고유 ID + `aria-describedby` 에러 메시지 연결
- BottomNav에 `aria-current="page"` 적용

---

*본 보고서는 프론트엔드 소스 코드 직접 분석을 기반으로 작성되었습니다.*
