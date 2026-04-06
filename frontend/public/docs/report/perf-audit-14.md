# VirtuEx 성능 개선 감사 보고서 (14차)

**VirtuEx Performance Improvement Audit Report (14th)**

- 감사일: 2026-04-06
- 감사 범위: 13차 감사 미수정 항목 재검증, 번들 크기, 렌더링 성능, 네트워크/API, WebSocket, CSS, DB 인덱스
- 감사 방법: 소스 코드 정적 분석, 번들/캐싱 전략 검토
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)

---

## 이전 감사 대비 수정 현황 (13차 → 14차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [PERF-13-01] recharts 전체 번들 포함 (~300KB) | 수정 유지 | 순수 SVG 차트로 교체 완료 확인 (커밋 `2f3ec50`) |
| [PERF-13-02] Tiptap 에디터 동적 임포트 미적용 | **수정 완료** | `dynamic(() => import('@/components/ui/RichEditor'), { ssr: false })` 적용 |
| [PERF-13-03] isomorphic-dompurify 서버 번들 비대 | **수정 완료** | `dompurify`로 교체 — jsdom (~2.3MB) 번들 제거 |
| [PERF-13-04] leaderboard/page.tsx 200줄 초과 | 미수정 | 706줄 잔존. FLIP/카피트레이드 로직 분리 필요. 페이지네이션 적용으로 성능 영향은 완화 |
| [PERF-13-05] AssetList `new Date()` 매 렌더 | **수정 완료** | `useState` + 1분 간격 `setInterval`로 캐싱 |
| [PERF-13-06] AssetListItem `includes()` O(N) | **수정 완료** | `useMemo(() => new Set(...))` + `Set.has()` O(1) 조회로 전환 |
| [PERF-13-07] Dashboard `setLastUpdated` 전체 리렌더 | **수정 완료** | `useRef`로 변경 — 대시보드 전체 리렌더 방지 |
| [PERF-13-08] OrderForm `currentPrice` 캐스케이딩 렌더 | 미수정 | `isUserEditing` 플래그 미적용 |
| [PERF-13-09] SpotlightSearch 키보드 핸들러 재등록 | 미수정 | 실질 영향 미미 |
| [PERF-13-10] usePortfolio 중복 폴링 | **수정 완료** | 동일 `queryKey: ['portfolio']`로 캐시 공유 |
| [PERF-13-11] useUnreadCount 30초 폴링 + WebSocket 중복 | 미수정 | WebSocket 연결 상태 기반 폴링 제어 미적용 |
| [PERF-13-12] useWebSocket `unsubscribe` 누락 | **수정 완료** | 제거된 심볼에 `socket.emit('unsubscribe')` 전송 추가 |
| [PERF-13-13] 단일 심볼 배열 래핑 | 미수정 (의도적) | 실질 영향 미미 |
| [PERF-13-14] Pretendard 폰트 이중 로딩 | 수정 유지 | globals.css `@import` 제거 완료 확인 (커밋 `7c13c7e`) |
| [PERF-13-15] 전역 transition 상시 활성 | **수정 완료** | `html.theme-transitioning` 클래스 스코프로 전환 |
| [PERF-13-16] LeaderboardTable FLIP 강제 리플로우 | **수정 완료** | `requestAnimationFrame` 배치 패턴 적용 |
| [PERF-13-17] animate-list-stagger 최대 600ms 지연 | 미수정 | 초기 로드 전용 분리 미적용 |
| [PERF-13-18] 모든 페이지 'use client' | 미수정 | SSR/ISR 하이브리드 전환은 대규모 아키텍처 변경 필요 |
| [PERF-13-19] ConnectionGuard 비활성 탭 폴링 | **수정 완료** | `document.visibilityState` 기반 폴링 일시정지 |
| [PERF-13-20] chat store matchMedia 리스너 미해제 | 미수정 | HMR 전용 영향, 프로덕션 무해 |
| [PERF-13-21] Order 테이블 복합 인덱스 누락 | **수정 완료** | `@@index([userId, status, createdAt(sort: Desc)])` 추가 |
| [BD-M-02] 리더보드 679줄 미분할 | 미수정 | 706줄. 페이지네이션 적용으로 렌더링 성능은 개선 |
| [LV-M-02] 리더보드 100건 가상화 미적용 | 부분 수정 | 20건 페이지네이션으로 대체. 가상화 미적용이나 성능 목표 달성 |

**요약:** 13차에서 지적된 22건 중 **13건 수정, 2건 이전 수정 유지, 7건 미수정/보류**.

---

## 14차 감사 결과 요약

| 카테고리 | Critical | High | Medium | Low | 합계 |
|----------|----------|------|--------|-----|------|
| A. 번들 크기 | 0 | 0 | 0 | 1 | 1 |
| B. 렌더링 성능 | 0 | 0 | 1 | 1 | 2 |
| C. 아키텍처 | 0 | 0 | 1 | 0 | 1 |
| **합계** | **0** | **0** | **2** | **2** | **4** |

---

## A. 번들 크기 — 1건

### [PERF-14-01] leaderboard/page.tsx 706줄 — 3차 연속 미수정

- **심각도**: Low
- **위치**: `frontend/src/app/(main)/leaderboard/page.tsx`
- **현상**: FLIP 애니메이션 로직, 카피트레이드/팔로우 상태 관리, 프로필 모달 상태가 페이지 컴포넌트에 잔존. `LeaderboardTable`, `LeaderboardCard` 등 하위 컴포넌트 분리는 완료되었으나 페이지 자체가 여전히 706줄
- **영향**: 초기 파싱 비용. 다만 로직 대부분이 콜백/이벤트 핸들러이며 페이지네이션 적용으로 실질 렌더 비용은 경미
- **권장**: FLIP 애니메이션을 `useFlipAnimation` 커스텀 훅, 카피트레이드 상태를 `useCopyTrade` 훅으로 분리

---

## B. 렌더링 성능 — 2건

### [PERF-14-02] OrderForm — currentPrice 변경 시 사용자 입력 덮어쓰기 (13차 이월)

- **심각도**: Medium
- **위치**: `frontend/src/components/trading/OrderForm.tsx`
- **현상**: WebSocket 가격 업데이트(500ms)마다 `setPrice(displayPrice)` 호출로 주문 폼 리렌더 + 사용자 수동 가격 입력 덮어쓰기
- **영향**: 사용자가 지정가 주문 시 가격을 직접 입력하면 500ms마다 현재가로 리셋됨
- **권장**: `isUserEditing` 플래그를 추가하여 사용자 편집 중에는 자동 동기화 건너뛰기

### [PERF-14-03] useUnreadCount 30초 폴링 + WebSocket 이벤트 중복 (13차 이월)

- **심각도**: Low
- **위치**: `frontend/src/hooks/useNotifications.ts`
- **현상**: WebSocket 연결 상태와 무관하게 30초마다 읽지 않은 알림 수를 폴링. WebSocket이 정상 연결된 상태에서는 불필요
- **영향**: 인증 사용자 기준 30초마다 GET 요청 1건
- **권장**: WebSocket 연결 상태 체크 후 연결 시 폴링 비활성화

---

## C. 아키텍처 — 1건

### [PERF-14-04] SSR/ISR 미활용 — 모든 주요 페이지 'use client' (13차 이월)

- **심각도**: Medium
- **위치**: 모든 `(main)/***/page.tsx` 파일
- **현상**: Next.js 15의 서버 컴포넌트, ISR, Streaming SSR 등 서버 사이드 최적화가 전혀 활용되지 않음
- **영향**: 초기 LCP 지연, SEO 영향 (크롤러가 빈 shell만 인덱싱)
- **권장**: 정적/공개 데이터(자산 목록, 공지사항 등)를 서버 컴포넌트에서 사전 페칭하는 하이브리드 렌더링 전략 검토. 대규모 아키텍처 변경이 필요하므로 별도 스프린트로 계획 권장

---

## 종합 평가

### 성능 수준: 양호 (Good)

13차 대비 번들 크기, 렌더링 최적화, 네트워크 효율, DB 인덱스 등 핵심 성능 지표가 대폭 개선되었습니다.

**이번 차수 주요 개선:**
- recharts → 순수 SVG 차트 (~300KB 번들 제거)
- isomorphic-dompurify → dompurify (~2.3MB jsdom 번들 제거)
- Tiptap 에디터 동적 임포트 (에디터 미사용 페이지에서 청크 제외)
- Pretendard 폰트 이중 로딩 제거
- 테마 전환 시에만 트랜지션 활성화 (평소 레이아웃 비용 제거)
- AssetList O(N²) → O(N) 관심종목 조회 최적화
- Dashboard 2초 리렌더 제거 (`useRef` 전환)
- WebSocket 구독 해제 누락 수정
- 포트폴리오 쿼리 캐시 공유 (중복 폴링 제거)
- ConnectionGuard 비활성 탭 폴링 중단
- Order 테이블 복합 인덱스 추가

**잔여 이슈:** 4건 (Medium 2 + Low 2) — 아키텍처 수준 변경(SSR) 및 UX 관련 최적화

---

*본 보고서는 2026-04-06 기준 소스 코드 정적 분석 결과입니다.*
