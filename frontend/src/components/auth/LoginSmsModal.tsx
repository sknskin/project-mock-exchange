'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

interface LoginSmsModalProps {
  isOpen: boolean;
  sessionId: string;
  maskedPhone: string;
  onSuccess: (data: { user: { id: string; email: string; name: string; role: string }; accessToken: string }) => void;
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
  const modalRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  useFocusTrap(modalRef, isOpen);

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

  // ESC 키로 닫기 / Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 배경 스크롤 완전 방지 (모바일 포함) / Full scroll lock including mobile
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
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
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
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
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 overscroll-none" role="dialog" aria-modal="true" aria-labelledby="login-sms-modal-title" ref={modalRef}>
      {/* 오버레이 — 클릭/터치해도 닫히지 않음 / Overlay — click/touch does NOT close */}
      <div className="absolute inset-0 bg-black/60" onTouchMove={(e) => e.preventDefault()} />

      {/* 모달 본체 / Modal body */}
      <div className="relative bg-bg-primary border border-border rounded-2xl w-full max-w-[360px] shadow-2xl">
        {/* X 닫기 버튼 / X close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors disabled:opacity-40"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        <div className="p-8 pt-7">
          <h3 id="login-sms-modal-title" className="text-[16px] font-bold text-text-primary text-center">
            {t('auth.loginSms.title')}
          </h3>

          <p className="text-[13px] text-text-secondary text-center mt-2 leading-relaxed">
            {t('auth.loginSms.description')}
          </p>
          <p className="text-[14px] text-text-primary text-center font-mono mt-1">
            {maskedPhone}
          </p>

          <div className="mt-6 space-y-4">
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
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/20">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-danger">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-[13px] text-danger leading-snug">{t('auth.loginSms.expired')}</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/20 animate-shake">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-danger">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-[13px] text-danger leading-snug">{error}</p>
              </div>
            )}

            <div className="pt-2">
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
