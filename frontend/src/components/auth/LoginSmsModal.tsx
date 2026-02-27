'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

interface LoginSmsModalProps {
  isOpen: boolean;
  sessionId: string;
  maskedPhone: string;
  onSuccess: (data: { user: any; accessToken: string }) => void;
  onClose: () => void;
}

export default function LoginSmsModal({
  isOpen,
  sessionId,
  maskedPhone,
  onSuccess,
  onClose,
}: LoginSmsModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 상태 초기화 / Reset state
  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(180);
    setCode('');
    setError('');
    setLocked(false);
  }, [isOpen, sessionId]);

  // 타이머 / Timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0 || locked) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, locked, timeLeft]);

  // 자동 포커스 / Auto focus
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 배경 스크롤 방지 (ESC로 닫기 없음 — 보안 모달) / Lock body scroll (no ESC close — security modal)
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const expired = timeLeft <= 0;

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const handleVerify = async () => {
    if (!code || code.length !== 6 || expired || locked) return;
    setError('');
    setLoading(true);

    try {
      const { data: resp } = await api.post('/api/auth/login/verify-sms', {
        sessionId,
        code,
      });

      if (resp.success) {
        onSuccess({ user: resp.data.user, accessToken: resp.data.accessToken });
      } else {
        if (resp.attemptsLeft === 0) {
          setLocked(true);
          setError(t('auth.loginSms.accountLocked'));
        } else {
          setError(`${resp.message} (${resp.attemptsLeft}${t('auth.loginSms.attemptsLeft')})`);
        }
        setCode('');
        inputRef.current?.focus();
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg = axiosErr.response?.data?.message;
      if (msg === 'Session expired') {
        setError(t('auth.loginSms.sessionExpired'));
      } else if (msg === 'Account is locked') {
        setLocked(true);
        setError(t('auth.loginSms.accountLocked'));
      } else {
        setError(msg || t('auth.loginSms.invalidCode'));
      }
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* 오버레이 — 클릭해도 닫히지 않음 / Overlay — click does NOT close */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 모달 본체 / Modal body */}
      <div className="relative bg-bg-primary border border-border rounded-2xl w-full max-w-[360px] shadow-2xl">
        {/* X 닫기 버튼 / X close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors disabled:opacity-40"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        <div className="p-6 pt-5">
          <h3 className="text-[16px] font-bold text-text-primary text-center">
            {t('auth.loginSms.title')}
          </h3>

          <p className="text-[13px] text-text-secondary text-center mt-2 leading-relaxed">
            {t('auth.loginSms.description')}
          </p>
          <p className="text-[14px] text-text-primary text-center font-mono mt-1">
            {maskedPhone}
          </p>

          <div className="mt-5 space-y-3">
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('auth.loginSms.codePlaceholder')}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                }}
                disabled={expired || locked}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerify();
                }}
              />
              {!locked && (
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-mono ${
                    expired ? 'text-danger' : timeLeft <= 30 ? 'text-warning' : 'text-text-tertiary'
                  }`}
                >
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>

            {expired && !locked && (
              <p className="text-[13px] text-danger text-center">{t('auth.loginSms.expired')}</p>
            )}

            {error && (
              <p className="text-[13px] text-danger text-center leading-relaxed">{error}</p>
            )}

            <div className="pt-1">
              <Button
                type="button"
                size="lg"
                fullWidth
                disabled={loading || code.length !== 6 || expired || locked}
                onClick={handleVerify}
              >
                {loading ? t('auth.loginSms.verifying') : t('auth.loginSms.verify')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
