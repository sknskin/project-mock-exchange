/**
 * @file 인증 상태 스토어
 * @description Zustand으로 관리하는 인증 상태 (로그인, 로그아웃, 토큰)
 *
 * @file Auth State Store
 * @description Zustand store managing auth state: login, logout, tokens
 *
 * ============================================================================
 * SEC-C-01 (Critical): JWT Access Token Migration Plan
 * ============================================================================
 * CURRENT STATE: Access token is stored in sessionStorage, which is vulnerable
 * to XSS attacks. Any injected script can read sessionStorage and exfiltrate
 * the token.
 *
 * MIGRATION PLAN (4 steps):
 *
 * Step 1: Backend issues access token as HttpOnly cookie
 *   - Modify the auth controller's login/refresh endpoints to set the access
 *     token as an HttpOnly + Secure + SameSite=Strict cookie instead of
 *     returning it in the response body.
 *   - Cookie attributes: HttpOnly, Secure, SameSite=Strict, Path=/api,
 *     Max-Age matching token expiry.
 *
 * Step 2: Frontend stops storing token in sessionStorage
 *   - Remove accessToken from the Zustand persisted state (partialize).
 *   - Remove setToken() and the login() token parameter.
 *   - The cookie will be sent automatically by the browser on every request.
 *   - Remove the Authorization header from the axios request interceptor
 *     (lib/api.ts) since cookies are sent automatically.
 *   - Update the 401 response interceptor to call the refresh endpoint
 *     (which will also set a new cookie) instead of reading a stored token.
 *
 * Step 3: Add CSRF protection
 *   - Since cookies are now sent automatically, the app becomes vulnerable
 *     to CSRF attacks. Implement one of:
 *     (a) Double-submit cookie pattern: Backend sets a non-HttpOnly CSRF
 *         token cookie; frontend reads it and sends it as a custom header
 *         (e.g., X-CSRF-Token) on state-changing requests.
 *     (b) Synchronizer token pattern: Backend generates a CSRF token per
 *         session; frontend includes it in requests.
 *   - SameSite=Strict already provides baseline CSRF protection for modern
 *     browsers, but explicit CSRF tokens add defense-in-depth.
 *
 * Step 4: Update all API calls to rely on cookie-based auth
 *   - Ensure axios is configured with `withCredentials: true` so cookies
 *     are included in cross-origin requests (if API is on a different origin).
 *   - Audit all API calls to ensure none manually set Authorization headers.
 *   - Update WebSocket connections to authenticate via cookies instead of
 *     query-string tokens.
 *   - Remove any remaining references to accessToken in the codebase.
 *
 * TIMELINE: This migration should be prioritized before production launch.
 * ============================================================================
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

/** 역할별 세션 유지 시간 (초)
 * Role-based session duration in seconds */
const ROLE_SESSION_DURATION: Record<string, number> = {
  SYSTEM: 4 * 60 * 60,
  ADMIN: 1 * 60 * 60,
  USER: 30 * 60,
};

// 인증 상태 인터페이스 / Auth state interface
interface AuthState {
  /** 현재 로그인한 사용자
   * Currently logged-in user */
  user: User | null;
  /** JWT 액세스 토큰 — WebSocket 전용 (httpOnly 쿠키 인증이 주 방식)
   * JWT access token — WebSocket only (httpOnly cookie is primary auth) */
  accessToken: string | null;
  /** 인증 여부
   * Whether authenticated */
  isAuthenticated: boolean;
  /** 세션 만료 시각 (Unix ms)
   * Session expiration timestamp (Unix ms) */
  sessionExpiresAt: number | null;
  /** 세션 유지 시간 (초) — 연장 시 이 값으로 리셋
   * Session duration in seconds — reset to this value on extension */
  sessionDuration: number | null;
  /** 사용자 정보 갱신
   * Update user info */
  setUser: (user: User) => void;
  /** 토큰 갱신
   * Update token */
  setToken: (token: string) => void;
  /** 로그인 처리 (사용자 설정 + 선택적 토큰 — WebSocket용)
   * Login (sets user + optional token — for WebSocket) */
  login: (user: User, token?: string) => void;
  /** 로그아웃 처리 (모든 상태 초기화)
   * Logout (resets all state) */
  logout: () => void;
  /** 세션 타이머 설정 — 역할 기반 만료 시간 계산
   * Set session timer — calculate role-based expiry */
  setSession: (role: string) => void;
}

// httpOnly 쿠키로 토큰 저장 전환 완료 — accessToken은 sessionStorage에 저장하지 않음
// Token storage migrated to httpOnly cookies — accessToken is no longer persisted to sessionStorage
// sessionStorage에 저장할 상태 부분집합 (토큰 제외) / Subset of state persisted to sessionStorage (no token)
type PersistedAuthState = Pick<AuthState, 'user' | 'isAuthenticated' | 'sessionExpiresAt' | 'sessionDuration'>;

// API 기본 URL — 세션 검증용 (인터셉터 회피 위해 fetch 직접 사용)
// API base URL — for session validation (using fetch directly to avoid interceptor)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      sessionExpiresAt: null,
      sessionDuration: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ accessToken: token }),
      login: (user, token) => {
        const duration = ROLE_SESSION_DURATION[user.role] || ROLE_SESSION_DURATION.USER;
        set({
          user,
          accessToken: token ?? null,
          isAuthenticated: true,
          sessionExpiresAt: Date.now() + duration * 1000,
          sessionDuration: duration,
        });
      },
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, sessionExpiresAt: null, sessionDuration: null }),
      setSession: (role: string) => {
        const duration = ROLE_SESSION_DURATION[role] || ROLE_SESSION_DURATION.USER;
        set({ sessionExpiresAt: Date.now() + duration * 1000, sessionDuration: duration });
      },
    }),
    {
      name: 'virtuex-auth',
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      // accessToken은 sessionStorage에 저장하지 않음 — httpOnly 쿠키가 주 인증 방식
      // accessToken is NOT persisted to sessionStorage — httpOnly cookie is primary auth
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiresAt: state.sessionExpiresAt,
        sessionDuration: state.sessionDuration,
      }),
      // hydration 시 isAuthenticated를 false로 재설정 — 세션 검증 후 복원
      // Reset isAuthenticated to false on hydration — restore after session validation
      merge: (persistedState, currentState) => {
        const persisted = (persistedState || {}) as Partial<PersistedAuthState>;
        return {
          ...currentState,
          ...persisted,
          isAuthenticated: false,
        };
      },
      // hydration 완료 후 세션 유효성 검증
      // Validate session after hydration completes
      onRehydrateStorage: () => (state) => {
        if (!state?.user) return;
        // 저장된 사용자 정보가 있으면 쿠키 기반 세션 검증 (인터셉터 회피 위해 fetch 사용)
        // If stored user exists, validate cookie-based session (fetch to avoid interceptor)
        fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
          .then((res) => {
            if (!res.ok) throw new Error('Session expired');
            return res.json();
          })
          .then((data) => {
            const accessToken = data.data?.accessToken ?? data.accessToken;
            const store = useAuthStore.getState();
            const role = store.user?.role || 'USER';
            const duration = ROLE_SESSION_DURATION[role] || ROLE_SESSION_DURATION.USER;
            useAuthStore.setState({
              isAuthenticated: true,
              ...(accessToken ? { accessToken } : {}),
              sessionExpiresAt: Date.now() + duration * 1000,
              sessionDuration: duration,
            });
          })
          .catch(() => {
            useAuthStore.getState().logout();
          });
      },
    },
  ),
);
