/**
 * @file 인증 상태 스토어
 * @description Zustand으로 관리하는 인증 상태 (로그인, 로그아웃, 토큰)
 *
 * @file Auth State Store
 * @description Zustand store managing auth state: login, logout, tokens
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
