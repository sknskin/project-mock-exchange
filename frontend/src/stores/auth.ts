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

// 인증 상태 인터페이스 / Auth state interface
interface AuthState {
  /** 현재 로그인한 사용자
   * Currently logged-in user */
  user: User | null;
  /** JWT 액세스 토큰
   * JWT access token */
  accessToken: string | null;
  /** 인증 여부
   * Whether authenticated */
  isAuthenticated: boolean;
  /** 사용자 정보 갱신
   * Update user info */
  setUser: (user: User) => void;
  /** 토큰 갱신
   * Update token */
  setToken: (token: string) => void;
  /** 로그인 처리 (사용자 + 토큰 동시 설정)
   * Login (sets user + token at once) */
  login: (user: User, token: string) => void;
  /** 로그아웃 처리 (모든 상태 초기화)
   * Logout (resets all state) */
  logout: () => void;
}

// TODO: HttpOnly + Secure + SameSite 쿠키로 토큰 저장 전환 — XSS 완전 차단
// TODO: Migrate token storage to HttpOnly + Secure + SameSite cookies for full XSS protection
// sessionStorage에 저장할 상태 부분집합 / Subset of state persisted to sessionStorage
type PersistedAuthState = Pick<AuthState, 'user' | 'accessToken' | 'isAuthenticated'>;

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ accessToken: token }),
      login: (user, token) =>
        set({ user, accessToken: token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
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
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
