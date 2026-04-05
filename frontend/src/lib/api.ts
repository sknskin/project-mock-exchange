/**
 * @file API 클라이언트
 * @description Axios 인스턴스 + httpOnly 쿠키 인증 + 자동 갱신 로직
 *
 * @file API Client
 * @description Axios instance with httpOnly cookie auth and auto-refresh logic
 */
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

// Axios 인스턴스 생성 — 기본 URL, 쿠키 자동 전송 (httpOnly 쿠키 인증), 15초 타임아웃
// Create Axios instance — base URL, auto-send cookies (httpOnly cookie auth), 15s timeout
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

// NOTE: Authorization 헤더 인터셉터 제거됨 — httpOnly 쿠키가 브라우저에 의해 자동 전송됨
// NOTE: Authorization header interceptor removed — httpOnly cookies are sent automatically by the browser

/**
 * SEC-26-04: document.cookie에서 지정된 이름의 쿠키 값을 읽어 반환
 * SEC-26-04: Read a cookie value by name from document.cookie
 */
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// SEC-26-04: 요청 인터셉터 — 상태 변경 요청(POST, PUT, PATCH, DELETE)에 CSRF 토큰 헤더 자동 첨부
// SEC-26-04: Request interceptor — auto-attach CSRF token header on state-changing requests (POST, PUT, PATCH, DELETE)
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCookieValue('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// 토큰 갱신 동시 요청 방지용 플래그 및 큐 / Flag and queue to prevent concurrent token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (reason: unknown) => void;
}> = [];

// 대기 중인 요청들을 재시도하거나 에러 전파 (쿠키가 자동 전송되므로 토큰 파라미터 불필요)
// Retry queued requests or propagate error (no token parameter needed — cookies are sent automatically)
const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// 응답 인터셉터: 401 시 쿠키 기반 자동 갱신 → 실패 시 로그아웃
// Response interceptor: auto-refresh via cookie on 401, logout on failure
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (error.response?.status === 401 && !originalRequest._retry && isAuthenticated) {
      if (isRefreshing) {
        // 이미 갱신 중이면 큐에 추가하여 갱신 완료 후 재시도 (쿠키가 갱신되면 자동 전송됨)
        // Queue request if refresh is in progress — cookies are auto-sent after refresh
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 리프레시 엔드포인트 호출 — 서버가 새 access_token + refresh_token 쿠키를 설정함
        // Call refresh endpoint — server sets new access_token + refresh_token cookies
        const { data } = await axios.post(
          `${api.defaults.baseURL}/api/auth/refresh`,
          {},
          { withCredentials: true, timeout: 10000 },
        );

        // WebSocket 호환을 위해 스토어에 토큰 저장 (선택적 — 쿠키가 없는 WebSocket용)
        // Store token for WebSocket compatibility (optional — for WebSocket which can't use cookies)
        const accessToken = data.data?.accessToken ?? data.accessToken;
        if (accessToken) {
          useAuthStore.getState().setToken(accessToken);
        }

        processQueue(null);

        // 원래 요청 재시도 — 새 쿠키가 자동 전송됨
        // Retry original request — new cookies are sent automatically
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // 토큰 + 인증 상태를 즉시 초기화하여 후속 요청에 stale 토큰이 전달되지 않게 함
        // Immediately clear token + auth state so subsequent requests don't use stale token
        const authStore = useAuthStore.getState();
        if (authStore.isAuthenticated) {
          authStore.logout();
        }
        if (typeof window !== 'undefined') {
          // 인증 실패 시 로그인 페이지로 하드 리다이렉트 (인터셉터에서는 Router 접근 불가)
          // Hard redirect to login on auth failure (Router is inaccessible from interceptor)
          window.location.replace('/login');
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
