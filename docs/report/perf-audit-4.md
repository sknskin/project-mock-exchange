# VirtuEx 성능 개선 감사 보고서 (4차)

**VirtuEx Performance Improvement Audit Report (4th)**

- 감사일: 2026-03-15
- 감사 범위: 프론트엔드 렌더링/메모이제이션, 백엔드 쿼리 최적화, WebSocket 처리, 번들 크기, 커뮤니티 페이지 성능
- 감사 방법: 소스 코드 정적 분석, 렌더링 파이프라인 추적, 메모리 패턴 분석, 번들 구조 검토
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)
- 비고: 발견 사항 정리만 수행하며, 수정은 포함하지 않음

---

## 이전 감사 대비 수정 현황 (3차 → 4차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| 카피트레이딩 totalPages 미반환 | **수정됨** | 백엔드에서 Math.ceil(total/limit) 계산 추가 |
| 대시보드 AI 버튼 중첩 렌더링 | **수정됨** | AssetList props로 분리, 불필요한 리렌더 제거 |

---

## 요약 (Executive Summary)

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 프론트엔드 렌더링 | 0 | 2 | 3 | 1 | 6 |
| B. 데이터 페칭/캐싱 | 1 | 1 | 2 | 1 | 5 |
| C. 백엔드 쿼리 성능 | 0 | 2 | 2 | 0 | 4 |
| D. WebSocket/실시간 | 0 | 1 | 1 | 1 | 3 |
| E. 메모리 관리 | 0 | 1 | 2 | 1 | 4 |
| F. 빌드/번들 최적화 | 0 | 1 | 2 | 1 | 4 |
| **합계** | **1** | **8** | **12** | **5** | **26** |

---

## A. 프론트엔드 렌더링 — 6건

### [FR-H-01] AssetList 정렬 — useMemo 의존성 과다 (High)

**현상:** `filtered` useMemo의 의존성 배열에 `mainTab` prop이 포함되어 있으나, 부모 컴포넌트 리렌더 시 동일 값이라도 새 참조가 전달되면 수십~수백 건의 자산 데이터 재정렬 트리거
**위치:** `frontend/src/components/market/AssetList.tsx:92-150`
**영향:** 대시보드 가격 업데이트마다 불필요한 정렬 연산 가능
**권장:** `mainTab`을 문자열로 비교하거나 `useRef`로 이전 값과 비교 후 변경 시에만 재정렬
**심각도:** High

### [FR-H-02] 리더보드 FLIP 애니메이션 — 다수 행 동시 리플로우 (High)

**현상:** 3차에서 발견된 `void el.offsetHeight` 리플로우 강제 트리거가 여전히 존재. limit=100 확대 후 영향 범위 증가
**위치:** `frontend/src/app/(main)/leaderboard/page.tsx:236`
**영향:** 참여자 100명에서 리패치 시 최대 100회 연속 리플로우
**권장:** `requestAnimationFrame` 배치 처리 또는 `transform` 기반 애니메이션으로 전환
**심각도:** High

### [FR-M-01] 대시보드 periodChangeMap 불필요 재생성 (Medium)

**현상:** `periodChangeMap`이 `periodChanges` 배열에 의존하지만, 배열 내용이 동일해도 새 객체 참조로 인해 매번 Map 재생성. 하위 AssetList 컴포넌트까지 리렌더 전파
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:270-271`
**영향:** period 변경 없이도 WebSocket 가격 업데이트 시 Map 재생성
**권장:** `periodChanges` 데이터를 깊은 비교(deep compare)하거나, 별도 useMemo로 분리하여 안정적 참조 유지
**심각도:** Medium

### [FR-M-02] 포트폴리오 차트 — 전체 데이터 리렌더 (Medium)

**현상:** `PortfolioHistoryChart` 컴포넌트가 데이터 포인트 변경 시 SVG 전체를 리렌더링. 데이터 추가 시 기존 포인트도 모두 재계산
**위치:** `frontend/src/components/portfolio/PortfolioHistoryChart.tsx:135-142`
**영향:** 100+ 데이터 포인트에서 차트 업데이트 시 프레임 드롭 가능
**권장:** Canvas 기반 렌더링 전환 또는 증분 업데이트 적용
**심각도:** Medium

### [FR-M-03] 커뮤니티 게시글 목록 — 전체 로드 후 클라이언트 페이지네이션 (Medium)

**현상:** 커뮤니티 게시글을 전체 조회한 뒤 클라이언트에서 페이지 분할. 게시글 500건 이상에서 초기 로딩 2초+ 예상
**위치:** `frontend/src/app/(main)/community/page.tsx`
**영향:** 게시글 증가에 따른 초기 로딩 시간 선형 증가
**권장:** 서버 사이드 페이지네이션(offset/limit) 도입
**심각도:** Medium

### [FR-L-01] 회원관리 StatusDropdown — 제네릭 타입 any 사용 (Low)

**현상:** 역할 필터 추가로 `StatusDropdown` 컴포넌트의 `options` prop 타입이 `{ key: string; labelKey: any }[]`로 변경됨. 타입 안전성 저하
**위치:** `frontend/src/app/(main)/admin/users/page.tsx`
**영향:** 잘못된 labelKey 전달 시 컴파일 타임 감지 불가
**권장:** labelKey를 `TranslationKey` union type으로 복원하거나 제네릭 컴포넌트로 리팩터링
**심각도:** Low

---

## B. 데이터 페칭/캐싱 — 5건

### [FD-C-01] 카피트레이딩 실행 내역 — 대량 데이터 전체 스캔 (Critical)

**현상:** `getExecutionHistory`가 전체 실행 내역을 카운트한 후 페이지네이션. 실행 건수 1만 건 이상에서 COUNT 쿼리 비용 증가. 인덱스 없이 `userId` 기준 전체 스캔 가능
**위치:** `backend/services/portfolio/src/domain/services/copy-trade.service.ts:260-280`
**영향:** 활발한 카피 트레이딩 사용자의 내역 조회 시 응답 지연
**권장:** `userId + createdAt` 복합 인덱스 추가 및 cursor 기반 페이지네이션 검토
**심각도:** Critical

### [FD-H-01] 알림 미읽음 카운트 캐시 미갱신 (High)

**현상:** `useMarkAsRead`/`useMarkAllAsRead` 성공 후 `['notifications']` 쿼리만 무효화. 미읽음 카운트 쿼리가 별도로 존재하면 배지 숫자가 stale 상태 유지
**위치:** `frontend/src/hooks/useNotifications.ts:87-120`
**영향:** 알림 확인 후에도 네비게이션 바의 미읽음 배지가 이전 숫자 표시
**권장:** `queryClient.invalidateQueries({ queryKey: ['notifications'] })` 호출 시 관련 하위 키 전체 무효화 또는 unread-count 명시 추가
**심각도:** High

### [FD-M-01] 대시보드 초기 로딩 워터폴 — 3차 미수정 (Medium)

**현상:** `useMarketPrices` → `useAssets` → `usePeriodChanges` 순차 로딩 패턴 지속. 초기 표시까지 3개 API 순차 완료 대기
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:52-103`
**영향:** 초기 로딩 600ms-1.5s (API 당 200-500ms)
**권장:** Promise.all 병렬 로딩 또는 React Suspense 적용
**심각도:** Medium

### [FD-M-02] 카피 트레이딩 설정 조회 — 페이지 마운트마다 재요청 (Medium)

**현상:** 카피 트레이딩 설정 페이지 접근 시 staleTime 없이 매번 API 재요청. 동일 세션 내 반복 접근 시 불필요한 네트워크 호출
**위치:** `frontend/src/hooks/useCopyTrade.ts`
**영향:** 사용자가 설정 페이지를 자주 왔다갔다 할 경우 중복 요청
**권장:** `staleTime: 30000` (30초) 설정으로 불필요한 재요청 방지
**심각도:** Medium

### [FD-L-01] React Query devtools 프로덕션 포함 여부 확인 필요 (Low)

**현상:** React Query DevTools가 개발 환경에서만 로드되는지 확인 필요. 프로덕션 번들에 포함 시 불필요한 코드 추가
**위치:** `frontend/src/app/layout.tsx` 또는 `providers.tsx`
**권장:** `process.env.NODE_ENV === 'development'` 조건부 로딩 확인
**심각도:** Low

---

## C. 백엔드 쿼리 성능 — 4건

### [BQ-H-01] 리더보드 limit=100 확대 — 연산량 5배 증가 (High)

**현상:** 15차 감사 수정으로 리더보드 limit이 20→100으로 확대됨. 전체 계좌 스캔 + 보유 종목 가격 매핑 연산량이 5배 증가
**위치:** `backend/services/portfolio/src/domain/services/balance.service.ts:856-974`
**영향:** 10초 폴링 × 동시 접속 50명 = 분당 300회 × 100계좌 처리
**권장:** 리더보드 결과 캐시(30초 TTL) 즉시 도입
**심각도:** High

### [BQ-H-02] 카피 트레이딩 실행 — 트레이더별 독립 트랜잭션 미보장 (High)

**현상:** 여러 트레이더의 거래를 동시 카피 시 각 실행이 독립적 트랜잭션으로 처리되는지 확인 필요. 하나의 카피 실패가 다른 카피에 영향을 줄 수 있음
**위치:** `backend/services/portfolio/src/domain/services/copy-trade.service.ts`
**영향:** 동시 카피 시 부분 실패 처리 미비
**권장:** 트레이더별 독립 트랜잭션 보장 및 실패 격리
**심각도:** High

### [BQ-M-01] 환율 API 캐시 TTL 5초 — 리더보드 확대 후 미스율 증가 (Medium)

**현상:** 3차에서 발견된 환율 캐시 5초 TTL이 유지됨. limit=100 확대로 리더보드 응답 시간이 길어져 캐시 미스 가능성 증가
**위치:** `backend/services/portfolio/src/domain/services/balance.service.ts:991`
**영향:** 환율 API 외부 호출 빈도 증가
**권장:** 환율 캐시 TTL을 60초로 확대
**심각도:** Medium

### [BQ-M-02] 회원 조회 API — role 필터 파라미터 처리 미확인 (Medium)

**현상:** 프론트엔드에서 role 파라미터를 전송하지만 백엔드 user-auth 서비스에서 해당 파라미터를 WHERE 조건에 반영하는지 미확인. 미반영 시 필터가 동작하지 않음
**위치:** `backend/services/user-auth/`, `backend/services/api-gateway/`
**영향:** 역할 필터 선택 시 전체 회원이 그대로 표시되는 UI 불일치
**권장:** 백엔드 회원 조회 엔드포인트에 role 쿼리 파라미터 처리 추가
**심각도:** Medium

---

## D. WebSocket/실시간 — 3건

### [WS-H-01] 가격 업데이트 — 동일 가격 중복 업데이트 (High)

**현상:** WebSocket으로 수신한 가격이 이전 가격과 동일해도 상태 업데이트 수행. 500ms 배치 내 동일 종목의 중복 메시지가 모두 처리됨
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:213-227`
**영향:** 불필요한 상태 갱신 및 하위 컴포넌트 리렌더
**권장:** 이전 가격과 비교하여 변경된 종목만 상태 업데이트
**심각도:** High

### [WS-M-01] 채팅 WebSocket 재연결 — 지수 백오프 미적용 (Medium)

**현상:** 채팅 WebSocket 연결 해제 시 재연결 전략이 고정 간격인지 확인 필요. 서버 장애 시 모든 클라이언트가 동시 재연결하여 thundering herd 발생 가능
**위치:** `frontend/src/hooks/useChat.ts` 또는 `frontend/src/lib/websocket.ts`
**권장:** 지수 백오프(1s, 2s, 4s, 8s...) + 지터(jitter) 적용
**심각도:** Medium

### [WS-L-01] 실시간 토스트 — 페이지 비활성 시에도 축적 (Low)

**현상:** 브라우저 탭이 비활성 상태에서도 WebSocket 토스트가 계속 축적됨. 탭 복귀 시 MAX_TOASTS=5 초과 알림이 무시됨
**위치:** `frontend/src/stores/liveToast.ts`
**영향:** 중요 거래 알림이 비활성 탭에서 소실 가능
**권장:** 비활성 탭에서는 알림을 큐에 보관, 활성화 시 순차 표시
**심각도:** Low

---

## E. 메모리 관리 — 4건

### [MC-H-01] 채팅 MessageInput — typingTimer cleanup 누락 (High)

**현상:** `typingTimerRef` setTimeout이 컴포넌트 언마운트 시 정리되지 않음. onChange 핸들러에서만 조건부 클리어. 채팅방 전환 시 이전 타이머 콜백이 언마운트된 컴포넌트에 대해 실행
**위치:** `frontend/src/components/chat/MessageInput.tsx:44, 180-186`
**영향:** 빈번한 채팅방 전환 시 stale 콜백 누적
**권장:** useEffect cleanup에서 `clearTimeout(typingTimerRef.current)` 추가
**심각도:** High

### [MC-M-01] 대시보드 pendingPricesRef — 종목 수 비례 메모리 사용 (Medium)

**현상:** `pendingPricesRef.current`에 500ms마다 모든 구독 종목의 가격 업데이트가 누적. 구독 종목 50개에서 배치당 50개 객체 생성/해제
**위치:** `frontend/src/app/(main)/dashboard/page.tsx:213-227`
**영향:** 현재 규모에서는 미미하나 종목 확대 시 GC 압력 증가
**권장:** 동일 종목 중복 업데이트 병합 (최신 가격만 유지)
**심각도:** Medium

### [MC-M-02] 커뮤니티 TipTap 에디터 — 대형 문서 메모리 (Medium)

**현상:** TipTap 에디터가 문서 전체를 메모리에 유지. 이미지가 Base64로 삽입될 경우 문서 크기 급증
**위치:** `frontend/src/app/(main)/community/new/page.tsx`
**영향:** 이미지 10장 삽입 시 수십 MB 메모리 점유 가능
**권장:** 이미지를 즉시 서버 업로드 후 URL 참조로 대체
**심각도:** Medium

### [MC-L-01] 리더보드 prevRankMap — 3차 미수정 (Low)

**현상:** `prevRankMap.current`에 이전 사용자 ID가 계속 축적. limit=100 확대로 누적 속도 증가
**위치:** `frontend/src/app/(main)/leaderboard/page.tsx:206`
**영향:** 장시간 사용 시 미미한 메모리 누수
**권장:** 현재 데이터에 없는 이전 ID 정리 로직 추가
**심각도:** Low

---

## F. 빌드/번들 최적화 — 4건

### [BO-H-01] VirtuEx 프론트엔드 — First Load JS 102kB 공유 청크 (High)

**현상:** 모든 페이지가 공유하는 First Load JS가 102kB. 이 중 `chunks/6461-*.js`(45.5kB)와 `c0160536-*.js`(54.2kB)의 내용 분석 필요
**위치:** Next.js 빌드 출력
**영향:** 모든 페이지 초기 로딩에 102kB 다운로드 필요
**권장:** 공유 청크 구성 분석 후 페이지별로 필요한 코드만 포함하도록 최적화
**심각도:** High

### [BO-M-01] 감사 보고서 MD 파일 — 정적 빌드 포함 (Medium)

**현상:** `public/docs/report/` 디렉토리의 MD/PDF 파일이 모두 정적 빌드에 포함됨. 보고서 수 증가에 따라 빌드 크기 증가
**위치:** `frontend/public/docs/report/`
**영향:** 현재 18개 보고서로 영향 미미하나, 향후 확장 시 빌드 크기 선형 증가
**권장:** 보고서를 CDN 또는 외부 스토리지로 분리하거나 동적 로딩 적용
**심각도:** Medium

### [BO-M-02] i18n 번역 파일 — 전체 언어 동시 로드 (Medium)

**현상:** `i18n.ts`에 한국어/영어 번역이 모두 포함된 단일 모듈. 사용자는 하나의 언어만 사용하지만 양쪽 번역 데이터를 모두 로드
**위치:** `frontend/src/lib/i18n.ts`
**영향:** 번역 키 증가에 따라 불필요한 번들 크기 증가
**권장:** 언어별 동적 import 또는 서버 컴포넌트에서 언어별 전달
**심각도:** Medium

### [BO-L-01] Lucide 아이콘 — 트리쉐이킹 확인 필요 (Low)

**현상:** `lucide-react`에서 개별 아이콘을 import하고 있으나, 번들러가 사용되지 않는 아이콘을 제대로 제거하는지 확인 필요
**위치:** 전체 프론트엔드 컴포넌트
**영향:** 트리쉐이킹 미동작 시 전체 아이콘 셋(~500KB) 포함 가능
**권장:** `@lucide/lab` 또는 개별 파일 import 방식(`lucide-react/dist/esm/icons/...`) 확인
**심각도:** Low

---

## 종합 의견

4차 성능 감사에서는 총 26건의 이슈가 발견되었습니다. 15차 일반 감사에서 발견된 카피트레이딩 페이지네이션, 대시보드 AI 버튼 배치 문제가 수정된 것을 확인하였습니다.

Critical 1건(카피트레이딩 실행 내역 전체 스캔)은 서비스 확장 시 심각한 성능 병목이 될 수 있으므로 인덱스 추가가 필요합니다. 리더보드 limit 확대(20→100)로 인한 연산량 증가가 신규 High 이슈로 등록되었으며, 캐시 전략 도입이 시급합니다.

3차 대비 개선된 점:
- 카피트레이딩 totalPages 반환으로 프론트엔드 페이지네이션 정상 동작
- 대시보드 AI 버튼 분리로 불필요한 리렌더 감소

주요 신규 발견:
- 리더보드 limit=100 확대에 따른 백엔드 부하 5배 증가
- 채팅 컴포넌트 타이머 cleanup 누락
- 커뮤니티 게시판 클라이언트 사이드 페이지네이션 한계
- 알림 읽음 처리 후 미읽음 카운트 캐시 불일치

---

*본 보고서는 자동 생성된 감사 결과이며, 수정 사항은 포함되지 않습니다.*
