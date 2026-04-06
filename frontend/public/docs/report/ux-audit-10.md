# VirtuEx 사용자 UX 개선 감사 보고서 (10차)

**VirtuEx User Experience Improvement Audit Report (10th)**

- 감사일: 2026-04-06
- 감사 범위: 9차 감사 미수정 항목 재검증, 접근성(a11y), 모바일 반응형, 로딩 상태, 네비게이션, 폼/입력 UX, 모달/오버레이, 데이터 표시, 피드백, 국제화(i18n), 시각적 일관성
- 감사 방법: 프론트엔드 전체 소스 코드 직접 분석
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)

---

## 이전 감사 대비 수정 현황 (9차 → 10차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [UX-9-01] 리더보드 Trophy 아이콘 aria-hidden 누락 | **수정 완료** | `aria-hidden="true"` 적용 |
| [UX-9-02] 마이페이지 User 아이콘 aria-hidden 누락 | **수정 완료** | `aria-hidden="true"` 적용 |
| [UX-9-03] 공지사항 Megaphone 아이콘 aria-hidden 누락 | **수정 완료** | `aria-hidden="true"` 적용 |
| [UX-9-04] 리더보드 "(me)" 하드코딩 | **수정 완료** | `t('chat.me')` i18n 적용 |
| [UX-9-05] 커뮤니티 탭 role/aria 누락 | **수정 완료** | `role="tablist"`, `role="tab"`, `aria-selected` 적용 |
| [UX-9-06] 공지사항 검색 aria-label 누락 | **수정 완료** | `aria-label={t('announce.search')}` 적용 |
| [UX-9-07] 뉴스 검색 aria-label 누락 | **수정 완료** | `aria-label={t('news.search')}` 적용 |
| [UX-9-08] 비밀번호 토글 aria-label 영어 하드코딩 | **수정 완료** | `t('auth.showPassword')` / `t('auth.hidePassword')` i18n 적용 |
| [UX-9-09] 뉴스 탭+AI 버튼 320px 넘침 | **수정 완료** | 모바일에서 AI 버튼 별도 행 분리 (`flex-col sm:flex-row`), 탭 `overflow-x-auto` 적용 |
| [UX-9-10] 페이지네이션 모바일 넘침 | **수정 완료** | `-ml-8` → `sm:-ml-8` 모바일 오프셋 제거 |
| [UX-9-11] Footer 마키 하단 패딩 과다 | **수정 완료** | `pb-28` → `pb-20` 축소 |
| [UX-9-12] 마이페이지 편집 뒤로 가기 터치 타겟 부족 | **수정 완료** | `min-w-[44px] min-h-[44px]` WCAG 최소 터치 타겟 확보 |
| [UX-9-13] 마이페이지 스켈레톤 미적용 | **수정 완료** | `animate-pulse` 스켈레톤 UI 적용 |
| [UX-9-14] 마이페이지 편집 스켈레톤 미적용 | **수정 완료** | `animate-pulse` 스켈레톤 UI 적용 |
| [UX-9-15] 리더보드 빈 상태 구분 모호 | **수정 완료** | 필터 활성 시 `t('leaderboard.emptyFiltered')` 별도 메시지 |
| [UX-9-16] 종목 상세 `router.back()` 히스토리 미검사 | **수정 완료** | `window.history.length > 1 ? router.back() : router.push('/dashboard')` 적용 |
| [UX-9-17] ScrollToTop smooth 스크롤 페이지 전환 충돌 | **수정 완료** | `behavior: 'instant'` 적용 |
| [UX-9-18] 입금 한도 메시지 i18n 미적용 | **수정 완료** | `t('portfolio.maxDeposit')` + `{amount}` 플레이스홀더 적용 |
| [UX-9-19] 비밀번호 재설정 강도 피드백 부재 | **수정 완료** | `validatePassword()` + `ValidationFeedback` 컴포넌트 적용 |
| [UX-9-20] 마이페이지 편집 저장 로딩 미표시 | **수정 완료** | `isPending` 상태 기반 스피너 + 비활성화 적용 |
| [UX-9-21] 사용자 드롭다운 닫기 애니메이션 부재 | **수정 완료** | `animate-dropdown-out` + `closing` 상태 + `setTimeout` 패턴 적용 |
| [UX-9-22] 모바일 메뉴 포커스 트랩 미적용 | **수정 완료** | `useFocusTrap(mobileMenuRef, mobileMenuOpen)` 적용 |
| [UX-9-23] ConfirmModal 정적 ID 충돌 | **수정 완료** | `useId()` 훅으로 고유 ID 생성 |
| [UX-9-24] 공지사항 날짜 locale 미반영 | **수정 완료** | `toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year, month, day })` 적용 |
| [UX-9-25] 커뮤니티 카테고리 하드코딩 | **수정 완료** | `t('community.category.FREE')` 등 i18n 키 적용 |
| [UX-9-26] 커뮤니티 브레드크럼 인라인 locale 분기 | **수정 완료** | i18n 키로 통합 |
| [UX-9-27] Toast success/info 색상 동일 | **수정 완료** | success: `emerald`, info: `blue` 색상 분리 |
| [UX-9-28] 주문 수정 시 시각적 하이라이트 부재 | **수정 완료** | 2초간 행 하이라이트 애니메이션 적용 |
| [UX-9-29] global-error.tsx i18n 분리 미설명 | **수정 완료** | 의도적 분리 주석 추가 |
| [UX-9-30] 포트폴리오 CSV 헤더 영어 하드코딩 | **수정 완료** | `t('export.column.symbol')` 등 i18n 키 적용 |
| [UX-9-31] 뉴스 검색 Clear 버튼 영어 aria-label | **수정 완료** | `aria-label={t('common.clearSearch')}` 적용 |
| [UX-9-32] 대시보드 헤더 높이 불일치 | **수정 완료** | `h-[88px]` 헤더 영역 추가 |
| [UX-9-33] BottomSheet/OrderSheet 닫기 버튼 스타일 불일치 | **수정 완료** | `hover:bg-bg-tertiary` 통일 |
| [UX-9-34] ContentModal 닫기 버튼 danger 색상 | **수정 완료** | `bg-accent` 중립 색상으로 변경 |
| [UX-9-35] Footer 마키 img width/height 누락 | **수정 완료** | `width={20} height={20}` 속성 추가 |

**요약:** 9차에서 지적된 35건 **전체 수정 완료 (35/35)**.

---

## 10차 감사 결과 요약

| 심각도 | 발견 건수 |
|--------|-----------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 |
| **합계** | **1** |

---

## 1. 신규 기능 UX 감사

### [UX-10-01] 세션 연장 모달 — 접근성 및 사용성 양호 (확인)

- **심각도:** (양호 — 이슈 아님)
- **파일:** `frontend/src/components/ui/SessionExtendModal.tsx`
- **설명:** 새로 추가된 세션 연장 모달이 접근성 요구사항을 충족합니다:
  - `role="alertdialog"` + `aria-modal="true"` + `aria-labelledby` — 올바른 ARIA 설정
  - `useFocusTrap` — 포커스 트랩 적용
  - `useScrollLock` — 배경 스크롤 방지
  - ESC 키 → 세션 연장 처리 (실수로 인한 로그아웃 방지)
  - 1분 이하 긴급 스타일 (danger 색상) — 시각적 긴급성 전달
  - 남은 시간 `tabular-nums` 폰트 — 숫자 자릿수 변경 시 레이아웃 시프트 방지
  - 한/영 i18n 4개 키 등록 완료

---

## 2. 국제화 (i18n)

### [UX-10-02] 세션 연장 모달 남은 시간 형식 — locale 미반영

- **심각도:** Low
- **파일:** `frontend/src/components/ui/SessionExtendModal.tsx` (line 32-35, `formatTime`)
- **설명:** 남은 시간을 `MM:SS` 형식으로 표시하며, 이는 모든 locale에서 동일합니다. 한국어 사용자에게 "10:00" 대신 "10분 00초"와 같은 지역화된 형식이 더 직관적일 수 있으나, 모달의 시각적 컴팩트함을 고려하면 `MM:SS` 형식이 적절한 선택입니다.
- **현재 상태:** 기능적 영향 없음. 국제 표준 시간 표기법 사용으로 모든 locale에서 이해 가능.
- **권장:** 현재 형식 유지 권장. 필요 시 `10분 00초` / `10m 00s` 형태로 전환 검토

---

## 종합 평가

### 점수 요약

| 카테고리 | 점수 (10점 만점) | 비고 |
|----------|:---:|------|
| 접근성 (a11y) | 9.5 | 모든 아이콘 aria-hidden, 검색 aria-label, 탭 ARIA, 포커스 트랩 완비 |
| 모바일 반응형 | 9.5 | 320px 뷰포트 대응 완료, WCAG 44px 터치 타겟 확보, 페이지네이션 모바일 최적화 |
| 로딩 상태 | 9.5 | 전체 페이지 스켈레톤 적용, 저장 로딩 상태 표시 |
| 네비게이션 | 9.5 | 딥링크 안전, instant 스크롤, 히스토리 폴백 |
| 폼/입력 UX | 9.5 | 비밀번호 강도 피드백, 입금 한도 i18n, 저장 중 중복 방지 |
| 모달/오버레이 | 10.0 | 포커스 트랩, ESC, 닫기 애니메이션, useId 고유 ID 전체 적용 |
| 데이터 표시 | 9.5 | locale 날짜 포맷, 카테고리 i18n, CSV 헤더 i18n |
| 피드백 | 9.5 | success/info 색상 분리, 주문 수정 행 하이라이트 |
| 국제화 (i18n) | 9.5 | 4,300줄+ 번역, 하드코딩 제거, 세션 모달 한/영 지원 |
| 시각적 일관성 | 9.5 | 헤더 높이 통일, 닫기 버튼 스타일 통일, 드롭다운 애니메이션 |

### 전체 UX 점수: **95.5 / 100** (9차 대비 +14.0)

### 우선 수정 권장 항목: 없음

9차에서 보고된 35건 전체가 수정되었으며, 10차에서 신규 발견된 차단 이슈는 없습니다.

### 9차 → 10차 주요 개선사항

- **접근성**: aria-hidden, aria-label, role/aria-selected, useFocusTrap 전면 적용
- **모바일**: 뉴스 탭 320px 넘침 해결, 페이지네이션 모바일 최적화, 터치 타겟 44px 확보
- **i18n**: 입금 한도, CSV 헤더, 카테고리, 브레드크럼, aria-label 등 하드코딩 전면 제거
- **피드백**: Toast 색상 분리, 주문 수정 하이라이트, 저장 로딩 상태
- **일관성**: 대시보드 헤더 높이, 닫기 버튼 스타일, 드롭다운 애니메이션 통일
- **신규**: 세션 연장 모달 — 접근성 완비 (alertdialog, 포커스 트랩, i18n)

---

*본 보고서는 프론트엔드 소스 코드 직접 분석을 기반으로 작성되었습니다.*
