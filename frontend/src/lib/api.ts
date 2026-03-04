/**
 * @file API 클라이언트
 * @description Axios 인스턴스 + 토큰 인터셉터 + 자동 갱신 로직
 *
 * @file API Client
 * @description Axios instance with token interceptor and auto-refresh logic
 */
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

// Axios 인스턴스 생성 — 기본 URL, 쿠키 전송, 15초 타임아웃 / Create Axios instance — base URL, credentials, 15s timeout
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

// 요청 인터셉터: 모든 요청에 Bearer 토큰 자동 첨부 / Request interceptor: auto-attach Bearer token to all requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 토큰 갱신 동시 요청 방지용 플래그 및 큐 / Flag and queue to prevent concurrent token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

// 대기 중인 요청들을 새 토큰으로 재시도하거나 에러 전파 / Retry queued requests with new token or propagate error
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 응답 인터셉터: 401 시 토큰 자동 갱신 → 실패 시 로그아웃 / Response interceptor: auto-refresh on 401, logout on failure
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (error.response?.status === 401 && !originalRequest._retry && isAuthenticated) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/api/auth/refresh`,
          {},
          { withCredentials: true, timeout: 10000 },
        );

        const accessToken = data.data?.accessToken ?? data.accessToken;
        useAuthStore.getState().setToken(accessToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // 토큰 + 인증 상태를 즉시 초기화하여 후속 요청에 stale 토큰이 전달되지 않게 함
        // Immediately clear token + auth state so subsequent requests don't use stale token
        const authStore = useAuthStore.getState();
        if (authStore.isAuthenticated) {
          authStore.logout();
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
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
