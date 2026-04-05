/**
 * @file 로그인 페이지
 * @description 이메일/아이디와 비밀번호로 로그인 + SMS 2단계 인증
 *
 * @file Login Page
 * @description Login page with email/username, password, and SMS 2FA verification
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoginSmsModal from '@/components/auth/LoginSmsModal';
import type { User } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import VirtuExLogo from '@/components/ui/VirtuExLogo';
import api from '@/lib/api';
import type { AxiosError } from 'axios';
import { Eye, EyeOff } from 'lucide-react';

/** 로그인 페이지 컴포넌트 — 이메일/아이디 + 비밀번호 + SMS 2FA 처리
 * Login page component — email/username + password + SMS 2FA flow */
export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // SMS 인증 모달 상태 / SMS verification modal state
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  // 첫번째 입력 필드 자동 포커스 / Auto-focus first input field
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  /** 로그인 폼 제출 — 자격증명 검증 후 SMS 인증 모달 표시
   * Submit login form — validate credentials then show SMS modal */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: resp } = await api.post('/api/auth/login', {
        identifier,
        password,
      });

      const payload = resp.data ?? resp;

      if (payload.requireSmsVerification) {
        setSessionId(payload.sessionId);
        setMaskedPhone(payload.maskedPhone);
        setSmsModalOpen(true);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg = axiosErr.response?.data?.message;
      // 백엔드에서 이미 한국어 메시지를 반환하므로 그대로 표시
      // Backend returns Korean messages, display them directly
      setError(msg || t('auth.login.error'));
    } finally {
      setLoading(false);
    }
  };

  /** SMS 인증 성공 시 로그인 완료 및 대시보드 이동 (쿠키 인증 — accessToken은 WebSocket용 선택값)
   * Complete login and redirect to dashboard on SMS success (cookie auth — accessToken optional for WebSocket) */
  const handleSmsSuccess = (data: { user: { id: string; email: string; name: string; role: string }; accessToken?: string }) => {
    setSmsModalOpen(false);
    login(data.user as User, data.accessToken);
    router.push('/dashboard');
  };

  /** SMS 모달 닫기 및 세션 초기화
   * Close SMS modal and reset session state */
  const handleSmsClose = () => {
    setSmsModalOpen(false);
    setSessionId('');
    setMaskedPhone('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <VirtuExLogo size={48} />
          </div>
          <h1 className="text-[26px] font-extrabold text-text-primary">{t('auth.login.title')}</h1>
          <p className="text-[14px] text-text-tertiary mt-2.5 font-medium leading-relaxed">
            {t('auth.login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={firstInputRef}
            type="text"
            placeholder={t('auth.login.identifier')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            englishOnly
            required
          />
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              englishOnly
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-quaternary hover:text-text-secondary transition-colors"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>

          {error && (
            <p className="text-[13px] text-danger text-center py-1">{error}</p>
          )}

          <div className="pt-3">
            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={loading || !identifier || !password}
            >
              {loading ? t('auth.login.loading') : t('auth.login.submit')}
            </Button>
          </div>

          <div className="text-right mt-2">
            <Link href="/forgot-password" className="text-[13px] text-text-tertiary hover:text-accent transition-colors">
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
        </form>

        <p className="text-center text-[14px] text-text-tertiary mt-8">
          {t('auth.login.noAccount')}{' '}
          <Link
            href="/register"
            className="text-accent font-bold hover:underline"
          >
            {t('auth.login.register')}
          </Link>
        </p>
      </div>

      <LoginSmsModal
        isOpen={smsModalOpen}
        sessionId={sessionId}
        maskedPhone={maskedPhone}
        onSuccess={handleSmsSuccess}
        onClose={handleSmsClose}
      />
    </div>
  );
}
