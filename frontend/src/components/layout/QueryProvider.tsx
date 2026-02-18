/**
 * @file TanStack Query Provider
 * @description QueryClient를 생성하고 QueryClientProvider로 감싸는 래퍼
 *
 * @file TanStack Query Provider
 * @description Wrapper creating QueryClient and providing QueryClientProvider
 */
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
