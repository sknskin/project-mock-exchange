/**
 * @file 서버 연결 상태 감시
 * @description 백엔드 API가 응답하지 않으면 전체 화면 에러를 표시합니다
 *
 * @file Server Connection Guard
 * @description Shows a full-screen error when the backend API is unreachable
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const HEALTH_ENDPOINT = `${API_URL}/api/health`;
const CHECK_INTERVAL = 30_000;

/** localStorage에서 저장된 테마 가져오기
 * Get stored theme from localStorage */
function getStoredTheme(): 'dark' | 'light' {
  try {
    const raw = localStorage.getItem('virtuex-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.theme) return parsed.state.theme;
    }
  } catch { /* ignore */ }
  return 'dark';
}

export default function ConnectionGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [retrying, setRetrying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 백엔드 헬스 엔드포인트에 연결 상태 확인
   * Check connection status via backend health endpoint */
  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(HEALTH_ENDPOINT, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      if (res.ok) {
        setStatus('connected');
        return true;
      }
      // HTTP 에러이지만 서버가 응답함 — "연결됨"으로 처리 (HTTP error but server responded — still "connected")
      setStatus('connected');
      return true;
    } catch {
      // 네트워크 에러 — 서버 접근 불가 (Network error — server unreachable)
      setStatus('disconnected');
      return false;
    }
  }, []);

  useEffect(() => {
    checkHealth();
    intervalRef.current = setInterval(checkHealth, CHECK_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkHealth]);

  /** 수동 재연결 시도
   * Manual reconnection attempt */
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await checkHealth();
    setRetrying(false);
  }, [checkHealth]);

  // 초기 체크 — 렌더링 차단하지 않음 (Initial check — don't block rendering)
  if (status === 'checking') return <>{children}</>;
  if (status === 'connected') return <>{children}</>;

  // 연결 끊김 — 인라인 스타일 에러 표시 (CSS가 깨졌을 수 있음) (Disconnected — show inline-styled error, CSS may be broken)
  const theme = getStoredTheme();
  const isDark = theme === 'dark';

  const bg = isDark ? '#0D0D11' : '#F8F9FA';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const accent = '#3B82F6';
  const accentHover = '#2563EB';
  const iconBg = isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)';
  const iconColor = '#EF4444';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      {/* 아이콘 (Icon) */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          backgroundColor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>

      {/* 제목 (Title) */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: textPrimary,
          margin: '0 0 12px 0',
        }}
      >
        {t('connection.title')}
      </h1>

      {/* 설명 (Description) */}
      <p
        style={{
          fontSize: 14,
          color: textSecondary,
          maxWidth: 400,
          lineHeight: 1.6,
          margin: '0 0 32px 0',
          whiteSpace: 'pre-line',
        }}
      >
        {t('connection.description')}
      </p>

      {/* 재시도 버튼 (Retry button) */}
      <button
        onClick={handleRetry}
        disabled={retrying}
        style={{
          height: 40,
          padding: '0 24px',
          fontSize: 14,
          fontWeight: 700,
          color: '#FFFFFF',
          backgroundColor: retrying ? accentHover : accent,
          border: 'none',
          borderRadius: 12,
          cursor: retrying ? 'default' : 'pointer',
          opacity: retrying ? 0.7 : 1,
          transition: 'background-color 0.2s, opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!retrying) (e.currentTarget as HTMLButtonElement).style.backgroundColor = accentHover;
        }}
        onMouseLeave={(e) => {
          if (!retrying) (e.currentTarget as HTMLButtonElement).style.backgroundColor = accent;
        }}
      >
        {retrying ? t('connection.retrying') : t('connection.retry')}
      </button>
    </div>
  );
}
