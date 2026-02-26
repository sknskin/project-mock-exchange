/**
 * @file TanStack Query Provider
 * @description QueryClient를 생성하고 QueryClientProvider로 감싸는 래퍼.
 *              모든 mutation 에러를 전역 토스트로 표시합니다.
 *
 * @file TanStack Query Provider
 * @description Wrapper creating QueryClient and providing QueryClientProvider.
 *              Shows global toast for all mutation errors.
 */
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { AxiosError } from 'axios';

/** 백엔드 영문 에러 → 한국어 매핑 (패턴 매칭) */
const ERROR_MAP_KO: [RegExp, string][] = [
  [/Insufficient funds/i, '잔액이 부족합니다'],
  [/Account not found/i, '계좌가 존재하지 않습니다. 먼저 입금해 주세요'],
  [/Failed to reserve funds/i, '자금 예약에 실패했습니다. 잔액을 확인해 주세요'],
  [/Symbol .+ not found|price unavailable/i, '해당 종목을 찾을 수 없거나 시세 정보가 없습니다'],
  [/Insufficient holdings/i, '보유 수량이 부족합니다'],
  [/Order not found/i, '주문을 찾을 수 없습니다'],
  [/Unauthorized/i, '로그인이 필요합니다'],
  [/already exists|already processed|duplicate/i, '이미 처리된 요청입니다'],
  [/Insufficient reserved funds/i, '예약된 자금이 부족합니다'],
  [/Reserve amount must be positive/i, '주문 금액은 0보다 커야 합니다'],
];

function localizeError(message: string, locale: string): string {
  if (locale !== 'ko') return message;
  for (const [pattern, korean] of ERROR_MAP_KO) {
    if (pattern.test(message)) return korean;
  }
  return message;
}

function extractErrorMessage(error: unknown): string {
  const locale = useSettingsStore.getState().locale ?? 'ko';

  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data;
    // NestJS validation errors: { message: string[] }
    if (Array.isArray(data.message)) {
      return localizeError(data.message[0], locale);
    }
    // NestJS single error: { message: string }
    if (typeof data.message === 'string') {
      return localizeError(data.message, locale);
    }
  }
  if (error instanceof Error) {
    return localizeError(error.message, locale);
  }
  return locale === 'ko' ? '알 수 없는 오류가 발생했습니다' : 'An unexpected error occurred';
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
        mutationCache: new MutationCache({
          onError: (error) => {
            const message = extractErrorMessage(error);
            useToastStore.getState().addToast(message, 'error');
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
