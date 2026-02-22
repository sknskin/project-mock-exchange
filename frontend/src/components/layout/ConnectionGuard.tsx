/**
 * @file 서버 연결 상태 감시
 * @description 백엔드 API가 응답하지 않으면 전체 화면 에러를 표시합니다
 *
 * @file Server Connection Guard
 * @description Shows a full-screen error when the backend API is unreachable
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const HEALTH_ENDPOINT = `${API_URL}/health`;
const CHECK_INTERVAL = 30_000;

function getStoredLocale(): 'ko' | 'en' {
  try {
    const raw = localStorage.getItem('mock-exchange-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.locale) return parsed.state.locale;
    }
  } catch { /* ignore */ }
  return 'ko';
}

function getStoredTheme(): 'dark' | 'light' {
  try {
    const raw = localStorage.getItem('mock-exchange-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.theme) return parsed.state.theme;
    }
  } catch { /* ignore */ }
  return 'dark';
}

const text = {
  ko: {
    title: '서버 연결 실패',
    description: '서버에 연결할 수 없습니다.\n서비스가 점검 중이거나 네트워크 상태를 확인해주세요.',
    retry: '다시 시도',
    retrying: '연결 중...',
  },
  en: {
    title: 'Connection Failed',
    description: 'Unable to connect to the server.\nThe service may be under maintenance or please check your network.',
    retry: 'Retry',
    retrying: 'Connecting...',
  },
};

export default function ConnectionGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [retrying, setRetrying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // HTTP error but server responded — still "connected"
      setStatus('connected');
      return true;
    } catch {
      // Network error — server unreachable
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

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await checkHealth();
    setRetrying(false);
  }, [checkHealth]);

  // Initial check — don't block rendering
  if (status === 'checking') return <>{children}</>;
  if (status === 'connected') return <>{children}</>;

  // Disconnected — show inline-styled error (CSS may be broken)
  const locale = getStoredLocale();
  const theme = getStoredTheme();
  const t = text[locale];
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
      {/* Icon */}
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

      {/* Title */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: textPrimary,
          margin: '0 0 12px 0',
        }}
      >
        {t.title}
      </h1>

      {/* Description */}
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
        {t.description}
      </p>

      {/* Retry button */}
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
        {retrying ? t.retrying : t.retry}
      </button>
    </div>
  );
}
