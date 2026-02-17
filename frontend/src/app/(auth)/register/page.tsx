'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import type { AuthResponse } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Register
      await api.post('/api/auth/register', {
        username,
        email,
        password,
      });
      // Auto-login after registration
      const { data: loginResp } = await api.post<AuthResponse>(
        '/api/auth/login',
        { email, password },
      );
      const payload = loginResp.data ?? loginResp;
      login(payload.user, payload.accessToken);
      router.push('/');
    } catch {
      setError('회원가입에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">회원가입</h1>
          <p className="text-sm text-text-secondary mt-2">
            모의투자를 시작해보세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="사용자 이름"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
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
            minLength={8}
          />

          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={loading || !username || !email || !password}
          >
            {loading ? '가입 중...' : '가입하기'}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="text-accent hover:underline font-medium"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
