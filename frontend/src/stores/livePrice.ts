/**
 * @file 실시간 가격 스토어
 * @description React 외부 mutable Map + rAF 기반 알림으로 프레임 드랍 없는 가격 업데이트
 *
 * @file Live Price Store
 * @description Mutable Map outside React + rAF-based notifications for jank-free price updates
 */
import { useSyncExternalStore, useCallback } from 'react';
import type { PriceUpdate } from '@/types';

// React 외부 mutable 저장소
// Mutable store outside React
const priceMap = new Map<string, PriceUpdate>();

// 심볼별 구독자
// Per-symbol subscribers
const listeners = new Map<string, Set<() => void>>();

// rAF 배치 알림 — 변경된 심볼을 모아서 다음 프레임에서 한 번에 알림
// rAF batched notify — collect changed symbols and notify in next frame
let pendingNotify = new Set<string>();
let rafId: number | null = null;

function flushNotifications() {
  rafId = null;
  const symbols = pendingNotify;
  pendingNotify = new Set();

  for (const symbol of symbols) {
    const subs = listeners.get(symbol);
    if (subs) subs.forEach((fn) => fn());
  }
}

/**
 * 일괄 가격 업데이트 — Map에 즉시 저장, 알림은 rAF로 다음 프레임에서 일괄 처리
 * Batch price update — store immediately in Map, defer notifications to next frame via rAF
 */
export function batchUpdatePrices(batch: Record<string, PriceUpdate>): void {
  for (const [symbol, update] of Object.entries(batch)) {
    priceMap.set(symbol, update);
    pendingNotify.add(symbol);
  }

  if (rafId === null) {
    rafId = requestAnimationFrame(flushNotifications);
  }
}

/**
 * 특정 심볼의 실시간 가격만 구독 — 해당 심볼 변경 시에만 리렌더
 * Subscribe to a single symbol's live price — re-renders only when that symbol changes
 */
export function useLivePrice(symbol: string): PriceUpdate | undefined {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!listeners.has(symbol)) listeners.set(symbol, new Set());
      const subs = listeners.get(symbol)!;
      subs.add(onStoreChange);
      return () => { subs.delete(onStoreChange); };
    },
    [symbol],
  );

  const getSnapshot = useCallback(() => priceMap.get(symbol), [symbol]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
