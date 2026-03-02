/**
 * @file 페이지 뷰 트래커
 * @description 페이지 방문을 통계 API에 기록합니다
 *
 * @file Page View Tracker
 * @description Tracks page visits to the statistics API
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

  useEffect(() => {
    if (pathname) {
      trackRef.current.mutate(pathname);
    }
  }, [pathname]);

  return null;
}
