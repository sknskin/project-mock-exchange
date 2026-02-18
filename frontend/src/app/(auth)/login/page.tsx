/**
 * @file 로그인 페이지
 * @description 이메일/아이디와 비밀번호로 로그인하는 페이지
 *
 * @file Login Page
 * @description Login page with email/username and password authentication
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import api from '@/lib/api';
import type { AuthResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: resp } = await api.post<AuthResponse>('/api/auth/login', {
        identifier,
        password,
      });
      const payload = resp.data ?? resp;
      login(payload.user, payload.accessToken);
      router.push('/');
    } catch {
      setError(t('auth.login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-10">
          <h1 className="text-[26px] font-extrabold text-text-primary">{t('auth.login.title')}</h1>
          <p className="text-[14px] text-text-tertiary mt-2.5 font-medium leading-relaxed">
            {t('auth.login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder={t('auth.login.identifier')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder={t('auth.login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

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
    </div>
  );
}
