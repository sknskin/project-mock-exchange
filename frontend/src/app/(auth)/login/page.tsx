'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import type { AuthResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: resp } = await api.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });
      const payload = resp.data ?? resp;
      login(payload.user, payload.accessToken);
      router.push('/');
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-10">
          <h1 className="text-[26px] font-extrabold text-text-primary">로그인</h1>
          <p className="text-[14px] text-text-tertiary mt-2.5 font-medium leading-relaxed">
            VirtuEx 모의투자에 오신 걸 환영합니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="비밀번호"
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
              disabled={loading || !email || !password}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </div>
        </form>

        <p className="text-center text-[14px] text-text-tertiary mt-8">
          계정이 없으신가요?{' '}
          <Link
            href="/register"
            className="text-accent font-bold hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
