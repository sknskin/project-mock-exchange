/**
 * @file 페이지 뷰 트래커
 * @description 페이지 방문을 통계 API에 기록합니다 (중복 방지 + 디바운스)
 *
 * @file Page View Tracker
 * @description Tracks page visits to the statistics API (dedup + debounce)
 */
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTrackPageView } from '@/hooks/useAdmin';

export default function PageViewTracker() {
  const pathname = usePathname();
  const track = useTrackPageView();
  const trackRef = useRef(track);
  trackRef.current = track;

  const lastPathRef = useRef<string | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!pathname) return;
    const now = Date.now();
    // 같은 경로 중복 방지 + 2초 디바운스 (Dedup same path + 2s debounce)
    if (pathname === lastPathRef.current || now - lastTimeRef.current < 2000) return;
    lastPathRef.current = pathname;
    lastTimeRef.current = now;
    trackRef.current.mutate(pathname);
  }, [pathname]);

  return null;
}
