'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';
import VirtuExLogo from '@/components/ui/VirtuExLogo';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

type Step = 'identifier' | 'sms' | 'newPassword';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('identifier');

  // 1단계: 아이디/이메일 입력 (Step 1: identifier)
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);

  // 2단계: SMS 인증 (Step 2: SMS verification)
  const [sessionId, setSessionId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(180);
  const codeRef = useRef<HTMLInputElement>(null);

  // 3단계: 새 비밀번호 (Step 3: new password)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => { identifierRef.current?.focus(); }, []);

  // SMS 타이머 (SMS timer)
  useEffect(() => {
    if (step !== 'sms' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  useEffect(() => {
    if (step === 'sms') setTimeout(() => codeRef.current?.focus(), 100);
    if (step === 'newPassword') setTimeout(() => passwordRef.current?.focus(), 100);
  }, [step]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // 1단계: 아이디 제출 (Step 1: submit identifier)
  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: resp } = await api.post('/api/auth/forgot-password', { identifier });
      const payload = resp.data ?? resp;
      setSessionId(payload.sessionId);
      setMaskedPhone(payload.maskedPhone);
      setTimeLeft(180);
      setCode('');
      setStep('sms');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg = axiosErr.response?.data?.message;
      if (msg === 'User not found') {
        setError(t('auth.forgot.userNotFound'));
      } else if (msg === 'Account is locked') {
        setError(t('auth.login.locked'));
      } else {
        setError(t('auth.forgot.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 2단계: SMS 인증 (Step 2: verify SMS)
  const handleSmsVerify = async () => {
    if (!code || code.length !== 6 || timeLeft <= 0) return;
    setError('');
    setLoading(true);
    try {
      const { data: resp } = await api.post('/api/auth/forgot-password/verify-sms', { sessionId, code });
      if (resp.success) {
        setStep('newPassword');
      } else {
        if (resp.attemptsLeft === 0) {
          setError(t('auth.forgot.tooManyAttempts'));
        } else {
          setError(`${resp.message} (${resp.attemptsLeft}${t('auth.loginSms.attemptsLeft')})`);
        }
        setCode('');
        codeRef.current?.focus();
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg = axiosErr.response?.data?.message;
      if (msg === 'Session expired') {
        setError(t('auth.loginSms.sessionExpired'));
      } else {
        setError(msg || t('auth.loginSms.invalidCode'));
      }
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  // 3단계: 비밀번호 재설정 (Step 3: reset password)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t('auth.forgot.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('auth.forgot.passwordTooShort'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password/reset', { sessionId, newPassword, confirmPassword });
      setSuccess(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg = axiosErr.response?.data?.message;
      if (msg === 'Session expired') {
        setError(t('auth.loginSms.sessionExpired'));
      } else {
        setError(msg || t('auth.forgot.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const expired = timeLeft <= 0;

  // 성공 화면 (Success screen)
  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-5">
        <div className="w-full max-w-[360px] text-center">
          <div className="flex justify-center mb-5">
            <VirtuExLogo size={48} />
          </div>
          <h1 className="text-[22px] font-extrabold text-text-primary mb-3">
            {t('auth.forgot.successTitle')}
          </h1>
          <p className="text-[14px] text-text-tertiary mb-8 leading-relaxed">
            {t('auth.forgot.successMessage')}
          </p>
          <Button size="lg" fullWidth onClick={() => router.push('/login')}>
            {t('auth.forgot.goToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <VirtuExLogo size={48} />
          </div>
          <h1 className="text-[22px] font-extrabold text-text-primary">
            {t('auth.forgot.title')}
          </h1>
          <p className="text-[14px] text-text-tertiary mt-2.5 font-medium leading-relaxed">
            {step === 'identifier' && t('auth.forgot.subtitle')}
            {step === 'sms' && t('auth.forgot.smsSubtitle')}
            {step === 'newPassword' && t('auth.forgot.newPasswordSubtitle')}
          </p>
          {step === 'sms' && (
            <p className="text-[14px] text-text-primary font-mono mt-1">{maskedPhone}</p>
          )}
        </div>

        {/* Step 1: 아이디/이메일 입력 */}
        {step === 'identifier' && (
          <form onSubmit={handleIdentifierSubmit} className="space-y-4">
            <Input
              ref={identifierRef}
              type="text"
              placeholder={t('auth.forgot.identifierPlaceholder')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              englishOnly
              required
            />
            {error && <p className="text-[13px] text-danger text-center py-1">{error}</p>}
            <div className="pt-3">
              <Button type="submit" size="lg" fullWidth disabled={loading || !identifier}>
                {loading ? t('common.loading') : t('auth.forgot.sendSms')}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: SMS 인증 */}
        {step === 'sms' && (
          <div className="space-y-4">
            <div className="relative">
              <Input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('auth.loginSms.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={expired}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSmsVerify(); }}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-mono ${expired ? 'text-danger' : timeLeft <= 30 ? 'text-warning' : 'text-text-tertiary'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            {expired && (
              <p className="text-[13px] text-danger text-center">{t('auth.loginSms.expired')}</p>
            )}
            {error && <p className="text-[13px] text-danger text-center animate-shake">{error}</p>}
            <div className="pt-3">
              <Button type="button" size="lg" fullWidth disabled={loading || code.length !== 6 || expired} onClick={handleSmsVerify}>
                {loading ? t('auth.loginSms.verifying') : t('auth.loginSms.verify')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 새 비밀번호 입력 */}
        {step === 'newPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              ref={passwordRef}
              type="password"
              placeholder={t('auth.forgot.newPasswordPlaceholder')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              englishOnly
              required
            />
            <Input
              type="password"
              placeholder={t('auth.forgot.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              englishOnly
              required
            />
            {error && <p className="text-[13px] text-danger text-center py-1">{error}</p>}
            <div className="pt-3">
              <Button type="submit" size="lg" fullWidth disabled={loading || !newPassword || !confirmPassword}>
                {loading ? t('common.loading') : t('auth.forgot.resetPassword')}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-[14px] text-text-tertiary mt-8">
          <Link href="/login" className="text-accent font-bold hover:underline">
            {t('auth.forgot.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
