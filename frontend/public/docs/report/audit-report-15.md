# VirtuEx 시스템 감사 보고서 (15차)

**VirtuEx System Audit Report (15th)**

- 감사일: 2026-03-15
- 감사 범위: UI 레이아웃 일관성, 토스트 알림 시스템, 리더보드 데이터 정합성, AI 분석 버튼 배치, 감사 보고서 관리 체계
- 감사 방법: 전체 소스 코드 정적 분석 + UI 컴포넌트 교차 검증 + API 데이터 흐름 추적
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 본 보고서는 발견 사항만 기록하며, 수정은 포함하지 않음

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. UI 레이아웃/배치 | 0 | 2 | 3 | 1 | 6 |
| B. 토스트 알림 시스템 | 0 | 3 | 2 | 1 | 6 |
| C. 리더보드/데이터 정합성 | 1 | 2 | 1 | 0 | 4 |
| D. API 통신 | 0 | 1 | 2 | 1 | 4 |
| E. 접근성/UX | 0 | 0 | 3 | 2 | 5 |
| F. 코드 품질 | 0 | 1 | 2 | 3 | 6 |
| **합계** | **1** | **9** | **13** | **8** | **31** |

---

## A. UI 레이아웃/배치 — 6건

### [UI-H-01] 대시보드 AI 분석 버튼 위치 불일치 (High)

**현상:** 대시보드 필터 섹션에서 AI 분석 버튼이 데이터 소스 배지와 혼재되어 있어 시각적 계층 구조가 불명확함
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:331-358`
**권장:** AI 분석 버튼을 필터 섹션 최대 우측에 독립적으로 배치하여 기능 접근성 향상
**심각도:** High

### [UI-H-02] 뉴스 AI 분석 버튼 배치 혼란 (High)

**현상:** 뉴스 페이지에서 AI 분석 버튼이 날짜 필터 옵션과 같은 행에 위치하여 필터 버튼으로 오인될 수 있음
**위치:** `frontend/src/app/(main)/news/page.tsx:276-293`
**권장:** AI 분석 버튼을 카테고리 탭 섹션 최대 우측으로 이동하여 탭 수준의 액션으로 명확히 구분
**심각도:** High

### [UI-M-01] 토스트 알림 위치 불일치 — 일반 vs 실시간 (Medium)

**현상:** 일반 토스트(`ToastContainer`)는 하단 중앙, 실시간 토스트(`LiveToastContainer`)는 우측 하단에 표시되어 사용자 혼란 야기
**위치:** `frontend/src/components/ui/ToastContainer.tsx:37`, `LiveToastContainer.tsx:78`
**권장:** 모든 토스트를 우측 하단으로 통일하여 일관된 알림 경험 제공
**심각도:** Medium

### [UI-M-02] 모바일 토스트 표시 영역 대시보드와 겹침 (Medium)

**현상:** 모바일에서 토스트가 하단 네비게이션 바 영역(bottom-24)과 겹칠 수 있음
**위치:** `frontend/src/components/ui/ToastContainer.tsx:37`
**권장:** 모바일/데스크탑 반응형 위치 조정 적용
**심각도:** Medium

### [UI-M-03] 미니맵/HUD 요소 해상도별 크기 미대응 (Medium)

**현상:** 레이싱 게임 미니맵 크기(170px)가 고해상도 모니터에서 지나치게 작게 표시됨
**위치:** `racing/src/game/ui/Minimap.tsx:8`
**권장:** 뷰포트 기반 반응형 크기 조정 또는 기본 크기 확대 검토
**심각도:** Medium

### [UI-L-01] 감사 보고서 목록 정렬 순서 (Low)

**현상:** manifest.json의 보고서 목록이 최신순으로 정렬되어 있으나, 향후 보고서 추가 시 수동 정렬 관리 필요
**위치:** `frontend/public/docs/report/manifest.json`
**권장:** 자동 날짜순 정렬 로직 도입 또는 정렬 컨벤션 문서화
**심각도:** Low

---

## B. 토스트 알림 시스템 — 6건

### [TOAST-H-01] 토스트 유형별 색상 규칙 미정립 (High)

**현상:** 일반 토스트(`ToastContainer`)의 색상 매핑이 비직관적임. `success`가 파란색(fall), `info`가 초록색(success)으로 매핑되어 있어 UX 혼란
**위치:** `frontend/src/stores/toast.ts:11`, `frontend/src/components/ui/ToastContainer.tsx:16-21`
**권장:** 통일 색상 규칙 수립: 성공/등록/수정=파란색, 채팅=회색, 주문/거래=초록색, 오류/실패=빨간색
**심각도:** High

### [TOAST-H-02] 실시간 토스트 색상 카테고리 불일치 (High)

**현상:** `LiveToastContainer`의 `chat-invited`가 accent(파란) 색상이지만, 채팅 관련 알림은 회색 계열이 더 직관적
**위치:** `frontend/src/components/ui/LiveToastContainer.tsx:44-55`
**권장:** 채팅 관련 카테고리(chat-message, chat-invited)는 회색으로, 거래 관련(trade)은 초록으로, 오류(chat-kicked, registration-rejected)는 빨간으로 통일
**심각도:** High

### [TOAST-H-03] 토스트 타입 'default'와 'success' 시각적 구분 불가 (High)

**현상:** `default`와 `success` 타입이 동일한 스타일을 공유하면 알림의 중요도/성격을 사용자가 구분할 수 없음
**위치:** `frontend/src/components/ui/ToastContainer.tsx:16-21`
**권장:** default는 범용 정보 알림(파란), success는 작업 성공 확인(파란/초록) 등 최소한의 차이 제공
**심각도:** High

### [TOAST-M-01] 토스트 자동 해제 시간 불일치 (Medium)

**현상:** 일반 토스트 3초, 실시간 토스트 4초로 해제 시간이 다름. 사용자 경험 일관성 저하
**위치:** `frontend/src/stores/toast.ts:60`, `frontend/src/stores/liveToast.ts:54`
**권장:** 해제 시간을 3-4초 범위 내에서 통일하거나, 카테고리별 차등 적용 정책 수립
**심각도:** Medium

### [TOAST-M-02] 토스트 최대 표시 개수 제한 부재 — 일반 토스트 (Medium)

**현상:** 일반 토스트(`useToastStore`)에는 최대 개수 제한이 없어 연속 호출 시 화면을 가릴 수 있음. 실시간 토스트는 MAX_TOASTS=5로 제한
**위치:** `frontend/src/stores/toast.ts:56-57`
**권장:** 일반 토스트에도 최대 5개 제한 적용
**심각도:** Medium

### [TOAST-L-01] 토스트 접근성(a11y) 미비 (Low)

**현상:** 토스트에 `role="alert"` 또는 `aria-live="polite"` 속성이 없어 스크린 리더 사용자가 알림을 인지할 수 없음
**위치:** `frontend/src/components/ui/ToastContainer.tsx:38-61`
**권장:** 토스트 컨테이너에 `role="alert"` 및 `aria-live="assertive"` 속성 추가
**심각도:** Low

---

## C. 리더보드/데이터 정합성 — 4건

### [LB-C-01] 리더보드 조회 기본 한도 20명 — 투자자 누락 (Critical)

**현상:** 프론트엔드가 `/api/portfolio/leaderboard`를 limit 파라미터 없이 호출하여 기본값 20명만 조회됨. 21번째 이후 사용자(admin2 포함)가 리더보드에 표시되지 않음
**위치:** `frontend/src/hooks/useLeaderboard.ts:49`, `backend/services/portfolio/src/presentation/controllers/portfolio.controller.ts:120`
**권장:** 프론트엔드에서 limit=100 파라미터를 명시적으로 전달하여 전체 투자자 조회
**심각도:** Critical

### [LB-H-01] 리더보드 API 게이트웨이 limit 기본값 불일치 (High)

**현상:** API 게이트웨이 Swagger 문서에는 기본값 10으로 기술되어 있으나, 실제 portfolio 서비스 기본값은 20. 문서-구현 불일치
**위치:** `backend/services/api-gateway/src/proxy/portfolio-proxy.controller.ts:148`
**권장:** Swagger 문서와 실제 기본값을 일치시키고, 적정 기본값 재검토
**심각도:** High

### [LB-H-02] 포트폴리오 데이터 갱신과 리더보드 동기화 지연 (High)

**현상:** 포트폴리오에서 admin2의 보유/잔액이 정상 표시되지만, 리더보드에서는 limit 제한으로 누락됨. 사용자는 포트폴리오에서 자신의 투자 데이터를 확인할 수 있지만 리더보드에서 자신을 찾을 수 없어 혼란
**위치:** `frontend/src/hooks/useLeaderboard.ts:49`
**권장:** 리더보드 조회 시 최소한 현재 로그인 사용자는 항상 포함되도록 보장
**심각도:** High

### [LB-M-01] 리더보드 investedOnly 필터 기본값 false (Medium)

**현상:** investedOnly 토글의 기본값이 false로 설정되어 있어 입금만 하고 거래하지 않은 사용자도 리더보드에 표시됨
**위치:** `frontend/src/app/(main)/leaderboard/page.tsx:131`
**권장:** 기본값을 유지하되, 필터 설명 텍스트를 보완하여 사용자에게 명확히 안내
**심각도:** Medium

---

## D. API 통신 — 4건

### [API-H-01] AI 분석 API 타임아웃 60초 — 사용자 이탈 위험 (High)

**현상:** AI 뉴스 분석 API 호출에 60초 타임아웃이 설정되어 있어 네트워크 지연 시 사용자가 오래 대기해야 함
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:172`, `news/page.tsx:178`
**권장:** 30초 타임아웃 + 진행률 표시 또는 스트리밍 응답 방식 검토
**심각도:** High

### [API-M-01] 뉴스 대량 조회 200건 — 네트워크 부하 (Medium)

**현상:** AI 분석 시 200건의 뉴스를 한 번에 조회 후 클라이언트에서 50건으로 필터링. 불필요한 네트워크 전송량
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:154`, `news/page.tsx:157`
**권장:** 백엔드에서 날짜 기반 필터링을 지원하여 필요한 뉴스만 전송
**심각도:** Medium

### [API-M-02] 리더보드 10초 리패치 — 서버 부하 고려 (Medium)

**현상:** 리더보드 데이터를 10초마다 자동 리패치. 사용자 수 증가 시 서버 부하 증가 우려
**위치:** `frontend/src/hooks/useLeaderboard.ts:70`
**권장:** 사용자 활동 감지 기반 리패치 또는 WebSocket 기반 실시간 업데이트 전환 검토
**심각도:** Medium

### [API-L-01] 리더보드 period/sortBy 쿼리 파라미터 미사용 (Low)

**현상:** 프론트엔드에서 period, sortBy 옵션을 queryKey에 포함하지만 실제 API 호출에 전달하지 않음. 클라이언트 사이드 정렬만 수행
**위치:** `frontend/src/hooks/useLeaderboard.ts:45-49`
**권장:** 백엔드 지원 시 서버 사이드 정렬/필터링으로 전환하여 데이터 전송량 절감
**심각도:** Low

---

## E. 접근성/UX — 5건

### [UX-M-01] 충돌 이펙트 강도 사용자 설정 부재 (Medium)

**현상:** 레이싱 게임의 충돌 시 화면 빨간 플래시/흔들림 효과의 강도를 사용자가 조절할 수 없음. 시각적 민감도가 높은 사용자에게 불편
**위치:** `racing/src/game/ui/HUD.tsx:187-197`
**권장:** 설정 메뉴에 이펙트 강도 조절 옵션 추가
**심각도:** Medium

### [UX-M-02] 레이싱 트랙 선택 시 미리보기 부재 (Medium)

**현상:** 12개 트랙 중 선택 시 트랙 형태나 특성을 사전에 확인할 수 없음
**위치:** `racing/src/game/ui/MainMenu.tsx`
**권장:** 트랙 선택 UI에 미니 프리뷰 또는 설명 표시
**심각도:** Medium

### [UX-M-03] 감사 보고서 PDF 미생성 (Medium)

**현상:** manifest.json에 PDF 경로가 등록되어 있으나, 일부 보고서의 PDF 파일이 실제로 존재하지 않을 수 있음
**위치:** `frontend/public/docs/report/manifest.json`
**권장:** MD → PDF 자동 변환 파이프라인 구축 또는 MD 직접 렌더링으로 통일
**심각도:** Medium

### [UX-L-01] 토스트 알림 소리 피드백 없음 (Low)

**현상:** 토스트 알림 발생 시 시각적 표시만 제공되고 청각적 피드백이 없어 멀티태스킹 중 알림을 놓칠 수 있음
**권장:** 선택적 알림 사운드 기능 추가
**심각도:** Low

### [UX-L-02] 리더보드 순위 변동 애니메이션 방향 직관성 (Low)

**현상:** 순위 상승 시 위로, 하강 시 아래로 슬라이드하는 FLIP 애니메이션이 데이터 리패치 시 일시적으로 깜빡일 수 있음
**위치:** `frontend/src/app/(main)/leaderboard/page.tsx:221-245`
**권장:** 애니메이션 시작 전 이전 데이터와 비교하여 변동이 없는 경우 애니메이션 스킵
**심각도:** Low

---

## F. 코드 품질 — 6건

### [CQ-H-01] 중복 AI 분석 핸들러 — 대시보드/뉴스 간 코드 중복 (High)

**현상:** 대시보드와 뉴스 페이지의 `handleAiAnalysis` 함수가 거의 동일한 로직을 각각 구현. 유지보수 시 양쪽 모두 수정 필요
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:147-186`, `news/page.tsx:148-194`
**권장:** 공통 커스텀 훅(`useAiAnalysis`)으로 추출하여 코드 중복 제거
**심각도:** High

### [CQ-M-01] 토스트 스토어 ID 카운터 모듈 레벨 분리 (Medium)

**현상:** `toast.ts`와 `liveToast.ts` 모두 모듈 레벨 `nextId` 변수를 사용하나 각각 독립적으로 카운팅. ID 충돌 가능성은 낮지만 통합 관리 미비
**위치:** `frontend/src/stores/toast.ts:41`, `frontend/src/stores/liveToast.ts:56`
**권장:** 토스트 ID 생성을 공통 유틸로 통합
**심각도:** Medium

### [CQ-M-02] 레이싱 트랙 높이 배열 수동 카운팅 (Medium)

**현상:** 트랙 heights 배열의 길이를 points 배열과 수동으로 맞춰야 하며, 불일치 시 런타임 에러 발생 가능
**위치:** `racing/src/maps/tracks.ts`
**권장:** 빌드 타임 또는 런타임에 길이 일치 검증 로직 추가
**심각도:** Medium

### [CQ-L-01] 미사용 import 잔존 — 뉴스 페이지 queryClient (Low)

**현상:** 뉴스 페이지에서 `queryClient`를 `handleAiAnalysis` 의존성 배열에 포함하지만 내부에서 직접 사용하지 않음
**위치:** `frontend/src/app/(main)/news/page.tsx:194`
**권장:** 불필요한 의존성 제거
**심각도:** Low

### [CQ-L-02] 하드코딩된 문자열 — 시장 전망/리스크 요인 (Low)

**현상:** AI 분석 모달의 '시장 전망', '리스크 요인' 레이블이 i18n 키 대신 삼항 연산자로 하드코딩
**위치:** `frontend/src/app/(main)/news/page.tsx:458-469`
**권장:** i18n 키로 전환하여 다국어 지원 일관성 확보
**심각도:** Low

### [CQ-L-03] 레이싱 CollisionSystem 미사용 타입 확장 여지 (Low)

**현상:** `CollisionResult.type`이 `'wall'`만 지원하지만 VehicleController에서 `'building'`, `'tree'` 등의 타입도 처리. 타입 정의 불일치
**위치:** `racing/src/game/world/CollisionSystem.ts:10`
**권장:** CollisionResult.type을 union type으로 확장
**심각도:** Low

---

## 종합 의견

15차 감사에서는 총 31건의 이슈가 발견되었습니다. Critical 1건(리더보드 투자자 누락)은 즉시 수정이 필요하며, High 9건 중 토스트 색상 통일과 AI 버튼 배치는 사용자 경험에 직접적 영향을 미치므로 우선 처리를 권장합니다.

이전 14차 감사 대비 코드 품질과 성능은 안정적이나, UI 일관성(토스트 위치/색상)과 데이터 정합성(리더보드 limit) 영역에서 개선이 필요합니다.

---

*본 보고서는 자동 생성된 감사 결과이며, 수정 사항은 포함되지 않습니다.*
