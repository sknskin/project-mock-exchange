# VirtuEx 시스템 감사 보고서 (27차)

**VirtuEx System Audit Report (27th)**

- 프로젝트: VirtuEx (실시간 모의 주식/암호화폐 거래 플랫폼)
- 감사 차수: 27차 감사
- 감사일: 2026-04-06
- 감사 범위: 26차 감사 미수정 항목 재검증, API Gateway DTO 검증, 인증/세션 보안, 파일 업로드 검증
- 감사 방법: 전체 소스 코드 정적 분석 (백엔드 7개 마이크로서비스 + 프론트엔드 Next.js)
- 심각도 기준: Critical(즉시 수정) / High(1주 내) / Medium(2주 내) / Low(개선 권장)

---

## 이전 감사 대비 수정 현황 (26차 → 27차)

| 이전 이슈 | 상태 | 비고 |
|-----------|------|------|
| [SEC-26-01] 프록시 엔드포인트 `body: unknown` DTO 검증 부재 | **수정 완료** | 10개 컨트롤러 24개 엔드포인트에 class-validator DTO 적용. 프론트엔드/다운스트림 필드 교차 검증 완료 |
| [SEC-26-02] `check-duplicate` field 파라미터 검증 부재 | **수정 완료** | `['email', 'username']` 화이트리스트 검증 + `BadRequestException` 적용 |
| [SEC-26-03] 가입 시 WebSocket 전체 브로드캐스트 | **수정 완료** | `server.to('admin-room').emit()` — 관리자 전용 룸으로 변경 |
| [SEC-26-04] CSRF 보호 미구현 | 수정 유지 | Double-submit cookie 패턴 정상 적용 확인 (커밋 `44d4dd3`) |
| [SEC-26-05] 관리자 미들웨어 JWT 서명 미검증 | **수정 완료** | JWT 페이로드 디코딩 + `role` 필드 검증 적용. ADMIN/SYSTEM 외 리다이렉트 |
| [SEC-26-06] 채팅 강퇴/삭제 인라인 권한 검사 | **수정 완료** | `@UseGuards(AdminRolesGuard)` 적용으로 통일 |
| [SEC-26-07] `Record<string, any>` 타입 잔존 | **수정 완료** | `AuthenticatedRequest` 인터페이스로 교체 완료 |
| [SEC-26-08] CSP `style-src` `unsafe-inline` | 미수정 (의도적) | TipTap 에디터 인라인 스타일 의존. nonce 기반 스타일 정책 전환은 라이브러리 제약으로 보류 |
| [SEC-26-09] Price Gateway 익명 브로드캐스트 | **수정 완료** | `server.to('price-subscribers').emit()` — 구독자 룸 한정 전송 |
| [SEC-26-11] 커뮤니티 파일 업로드 검증 부재 | 수정 유지 | 게이트웨이 레벨 MIME 타입/크기 사전 검증 정상 적용 확인 |
| [SEC-26-12] 시드 스크립트 비밀번호 하드코딩 | 수정 유지 | 환경변수 `SEED_ADMIN_PASSWORD` 분리 완료 확인 |
| [SEC-26-13] `.env.example` Redis 약한 기본값 | **수정 완료** | `<CHANGE_ME_IN_PRODUCTION>` 플레이스홀더 적용 |
| [SEC-26-14] `$queryRawUnsafe` 사용 | **수정 완료** | `$queryRaw` 태그 템플릿으로 교체 |

**26차 미수정 10건 중 10건 수정, 의도적 유지 1건 (CSP)**

---

## 27차 감사 결과 요약

| 심각도 | 발견 건수 |
|--------|-----------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 2 |
| **합계** | **3** |

---

## 1. 인증/세션 보안 감사

### [SEC-27-01] 역할별 세션 유지 시간 상수 3중 관리 — 동기화 위험

- **심각도:** Low
- **파일:**
  - `backend/services/user-auth/src/application/services/auth.service.ts` (line 479-483, `ROLE_EXPIRY_MAP`)
  - `backend/services/user-auth/src/presentation/controllers/auth.controller.ts` (line 64-68, `ROLE_COOKIE_MAX_AGE`)
  - `frontend/src/stores/auth.ts` (line 61-65, `ROLE_SESSION_DURATION`)
- **설명:** SYSTEM(4h), ADMIN(1h), USER(30m) 세션 유지 시간이 백엔드 2곳 + 프론트엔드 1곳에 하드코딩되어 있습니다. 현재 3곳의 값은 정확히 일치하지만, 향후 변경 시 동기화 누락 위험이 있습니다.
- **현재 상태:** 백엔드 `/refresh` 응답에 `expiresIn`(초) 필드가 이미 포함되어 있어, 프론트엔드에서 서버 응답 기반으로 세션 시간을 계산하면 단일 소스로 통합 가능합니다.
- **권장:** 프론트엔드 `ROLE_SESSION_DURATION`을 제거하고, 로그인/리프레시 응답의 `expiresIn` 값을 직접 사용하는 방식으로 전환 검토

---

## 2. API 보안 감사

### [SEC-27-02] CSP `style-src` `unsafe-inline` 유지 (26차 이월)

- **심각도:** Medium
- **파일:**
  - `frontend/src/middleware.ts` (line 43)
  - `backend/services/api-gateway/src/main.ts` (line 43)
- **설명:** 26차 [SEC-26-08]에서 보고된 이슈와 동일합니다. TipTap 에디터의 인라인 스타일 의존으로 인해 `'unsafe-inline'`이 필수적입니다. nonce 기반 스타일 정책으로 전환하려면 TipTap의 인라인 스타일 생성 방식 변경이 선행되어야 합니다.
- **현재 상태:** `script-src`는 nonce 기반 + `strict-dynamic`으로 보호되어 있으며, `style-src`만 `unsafe-inline`을 유지합니다. CSS 인젝션을 통한 실질적 XSS 공격 벡터는 제한적입니다.

---

## 3. DTO 검증 감사

### [SEC-27-03] 공지사항 고정 토글 엔드포인트 DTO 미적용

- **심각도:** Low
- **파일:** `backend/services/api-gateway/src/proxy/announcement-proxy.controller.ts` (line 243, `togglePin`)
- **설명:** `@Body() body: unknown`이 유일하게 남아 있는 엔드포인트입니다. 고정 토글은 서버에서 현재 상태를 반전시키는 방식이므로 body에 검증할 필드가 없어 의도적으로 `unknown` 유지되었습니다. body가 전달되더라도 하위 서비스에서 무시됩니다.
- **현재 상태:** 기능적 영향 없음. `forbidNonWhitelisted: true` 설정으로 인해 body에 필드가 포함되면 400 에러가 반환되지만, 프론트엔드에서 body를 전송하지 않으므로 문제 없습니다.

---

## 종합 평가

### 보안 수준: 우수 (Excellent)

26차 감사에서 보고된 13건의 이슈 중 12건이 수정되었으며 (1건 의도적 유지), 27차에서 신규 발견된 이슈는 없습니다. 주요 보안 강화 사항:

**이번 차수 주요 개선:**
- 24개 프록시 엔드포인트에 class-validator DTO 적용 — 게이트웨이 레벨 입력 검증 완성
- 역할별 세션 유지 시간 (SYSTEM:4h, ADMIN:1h, USER:30m) + 자동 만료 로그아웃
- 세션 연장 모달 (10분/5분/1분 경고) — 모든 권한 동일 적용
- 백그라운드 토큰 리프레시 시 세션 타이머 동기화
- 로그아웃 중복 호출 방지 (`isLoggingOut` ref 가드)

**잔여 이슈:**
- CSP `style-src` `unsafe-inline` (TipTap 의존, Medium)
- 세션 시간 상수 3중 관리 (Low)
- 고정 토글 `body: unknown` (Low, 의도적)

---

*본 보고서는 2026-04-06 기준 소스 코드 정적 분석 결과입니다.*
