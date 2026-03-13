# VirtuEx 시스템 감사 보고서 (13차)

**VirtuEx System Audit Report (13th)**

- 감사일: 2026-03-13
- 감사 범위: 리스크 관리 설정 교정 + 코드 리팩토링 + 감사 보고서 인프라 개선
- 감사 방법: 전체 소스 코드 정적 분석 + 빌드 검증 + 서비스 기동 테스트
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)

---

## 요약 (Executive Summary)

| 심각도 | 건수 | 주요 범주 |
|--------|------|-----------|
| **Critical** | 1 | 가짜 PDF 감사 보고서 (수정 완료) |
| **High** | 2 | 리스크 관리 기본값 불일치, 타입 안전성 (수정 완료) |
| **Medium** | 3 | 미사용 변수/파라미터, 프로덕션 로깅 (수정 완료) |
| **Low** | 2 | 도움말 드롭다운 잘림, 매니페스트 lint (수정 완료) |
| **합계** | **8** | |

---

## 1. 감사 보고서 인프라 — 1건

### [C-01] 11차/12차 감사 보고서 PDF가 가짜 (Critical) ✅
- **파일**: `public/docs/report/audit-report-11.pdf`, `audit-report-12.pdf`
- **설명**: 1~10차는 실제 PDF 파일(%PDF-1.4)이나, 11~12차는 마크다운 텍스트를 `.pdf` 확장자로 저장한 가짜 파일. 브라우저에서 PDF로 열리지 않음
- **원인**: 기존 PDF 생성 방식을 검증하지 않고 단순 파일 복사로 처리
- **수정**:
  - `scripts/md-to-pdf.mjs` 신규 생성: Puppeteer 기반 MD→실제 PDF 변환
  - 가짜 PDF 자동 감지 (`%PDF-` 헤더 검사) + 재변환
  - 11차/12차 PDF 재생성 완료 (PDF 1.4, 8페이지)
  - `generate-audit-manifest.mjs`의 잘못된 MD→PDF 복사 로직 제거

---

## 2. 리스크 관리 설정 — 2건

### [H-01] 단일 주문 최대 금액 기본값 불일치 (High) ✅
- **파일**: `system-settings.client.ts:48`, `adminSettings.ts:144`
- **설명**: order-engine 기본값 1억원, 프론트엔드 기본값 5천만원으로 서로 불일치. 요구 사양은 5억원
- **수정**: 양쪽 모두 `500,000,000` (5억원)으로 통일

### [H-02] 일일 손실 제한 기본값 불일치 (High) ✅
- **파일**: `adminSettings.ts:145`
- **설명**: 프론트엔드 기본값 10%로 설정, 요구 사양은 50%
- **수정**: `50`%로 통일 (order-engine은 이미 50%로 설정됨)

---

## 3. 코드 리팩토링 — 5건

### [H-03] notification.controller.ts `as any` 타입 단언 (High) ✅
- **파일**: `user-auth/src/presentation/controllers/notification.controller.ts:45`
- **설명**: `(body.type as any)` 사용으로 타입 안전성 상실. Prisma에서 생성된 `NotificationType` enum이 존재함에도 미활용
- **수정**: `NotificationType` enum import 후 `(body.type as NotificationType) ?? NotificationType.GENERAL`로 변경

### [M-01] AssetList/SpotlightSearch 미사용 `_onLoginRequired` 파라미터 (Medium) ✅
- **파일**: `AssetList.tsx:50`, `SpotlightSearch.tsx:29`
- **설명**: Props 인터페이스에 `onLoginRequired`가 정의되어 있으나 함수 내부에서 사용하지 않음. `_onLoginRequired`로 구조 분해하여 미사용 경고 회피 중
- **수정**: 구조 분해에서 `onLoginRequired` 제거 (Props 인터페이스는 유지 — dashboard에서 전달)

### [M-02] 프로덕션 ErrorBoundary에서 console.error 노출 (Medium) ✅
- **파일**: `app/error.tsx:65`, `app/(main)/error.tsx:24`, `app/(auth)/error.tsx:24`
- **설명**: 프로덕션 환경에서도 에러 상세 정보가 콘솔에 출력되어 정보 노출 우려
- **수정**: `if (process.env.NODE_ENV === 'development')` 조건 래핑으로 개발 환경에서만 출력

### [M-03] help/page.tsx 미사용 `_visibleTabs` 변수 (Medium) ✅
- **파일**: `help/page.tsx:425`
- **설명**: `const _visibleTabs = tabs.filter(...)` 선언 후 어디에서도 참조되지 않음
- **수정**: 해당 라인 삭제

### [L-01] generate-audit-manifest.mjs lint 에러 (Low) ✅
- **파일**: `scripts/generate-audit-manifest.mjs`
- **설명**: `no-empty` (빈 catch 블록), `no-unused-vars` (구조 분해 order), `no-undef` (console) 3건
- **수정**: catch에 주석 추가, eslint-disable-next-line, `/* global console */` 지시자 추가

### [L-02] 도움말 모바일 드롭다운 탭 잘림 (Low) ✅
- **파일**: `help/page.tsx`
- **설명**: `max-h-[600px]`이 16개 탭을 담기에 부족하여 서비스 상태 등 관리자 탭이 보이지 않음
- **수정**: `max-h-[520px]` + 내부 `max-h-[480px] overflow-y-auto`로 일반 탭(마이페이지까지) 표시 후 관리자 탭은 스크롤

---

## 검증 결과

| 항목 | 결과 |
|------|------|
| 프론트엔드 빌드 | ✅ 성공 |
| 백엔드 타입 검사 (order-engine) | ✅ 성공 |
| 백엔드 타입 검사 (user-auth) | ✅ 성공 |
| 서비스 기동 | ✅ 전체 정상 |

---

## 수정 파일 목록

### 프론트엔드 (7개 파일)
| 파일 | 변경 내용 |
|------|-----------|
| `stores/adminSettings.ts` | 리스크 관리 기본값 통일 (5억/50%) |
| `components/market/AssetList.tsx` | 미사용 `_onLoginRequired` 구조 분해 제거 |
| `components/market/SpotlightSearch.tsx` | 미사용 `_onLoginRequired` 구조 분해 제거 |
| `app/error.tsx` | console.error 개발 환경 전용으로 변경 |
| `app/(main)/error.tsx` | console.error 개발 환경 전용으로 변경 |
| `app/(auth)/error.tsx` | console.error 개발 환경 전용으로 변경 |
| `app/(main)/help/page.tsx` | 미사용 _visibleTabs 삭제 + 드롭다운 높이 조정 |

### 백엔드 (2개 파일)
| 파일 | 변경 내용 |
|------|-----------|
| `order-engine/infrastructure/settings/system-settings.client.ts` | 단일 주문 최대 금액 기본값 5억원 |
| `user-auth/presentation/controllers/notification.controller.ts` | `as any` → NotificationType enum 타입 단언 |

### 스크립트 (2개 파일)
| 파일 | 변경 내용 |
|------|-----------|
| `scripts/generate-audit-manifest.mjs` | lint 수정 + 가짜 PDF 복사 로직 제거 |
| `scripts/md-to-pdf.mjs` | 신규 — Puppeteer 기반 MD→PDF 변환 |
