/**
 * @file 자동 갱신 컨트롤 컴포넌트
 * @description 주기적 자동 갱신 + 수동 새로고침 버튼 + 갱신 경과 시간 표시를 통합한 공용 컴포넌트
 *
 * @file Auto-Refresh Control Component
 * @description Shared component combining periodic auto-refresh, manual refresh button, and elapsed time display
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';

interface RefreshControlProps {
  /** 자동 갱신 주기 (초) / Auto-refresh interval in seconds */
  intervalSeconds: number;
  /** 새로고침 실행 함수 / Refresh callback */
  onRefresh: () => Promise<unknown>;
}

export default function RefreshControl({ intervalSeconds, onRefresh }: RefreshControlProps) {
  const { t } = useTranslation();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const doRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      await onRefreshRef.current();
    } finally {
      // 최소 500ms 스피너 표시 후 리셋 / Show spinner for at least 500ms then reset
      setTimeout(() => {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
        setSecondsAgo(0);
      }, 500);
    }
  }, []);

  // 1초마다 경과 시간 카운트 / Count elapsed seconds every 1s
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // 주기적 자동 갱신 / Periodic auto-refresh
  useEffect(() => {
    const id = setInterval(() => {
      doRefresh();
    }, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [intervalSeconds, doRefresh]);

  // 경과 시간 텍스트 / Elapsed time text
  const elapsedText = secondsAgo < 2
    ? t('common.justRefreshed')
    : t('common.secondsAgo').replace('{n}', String(secondsAgo));

  // 갱신 주기 텍스트 / Refresh interval text
  const intervalText = t('common.autoRefreshInterval').replace('{n}', String(intervalSeconds));

  return (
    <div className="flex items-center gap-2">
      {/* 2줄 갱신 정보 / Two-line refresh info */}
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-[11px] text-text-quaternary tabular-nums leading-tight">
          {elapsedText}
        </span>
        <span className="text-[10px] text-text-quaternary/70 leading-tight">
          {intervalText}
        </span>
      </div>
      {/* 새로고침 버튼 / Refresh button */}
      <button
        onClick={doRefresh}
        disabled={isRefreshing}
        className={cn(
          'flex items-center justify-center gap-2 h-10 min-w-[120px] px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 border btn-outline',
          isRefreshing
            ? 'border-border text-text-quaternary cursor-not-allowed'
            : 'border-accent/30 text-accent hover:bg-accent/10',
        )}
      >
        <RefreshCw className={cn('w-4 h-4 shrink-0', isRefreshing && 'animate-spin')} />
        {t('common.refresh')}
      </button>
    </div>
  );
}
