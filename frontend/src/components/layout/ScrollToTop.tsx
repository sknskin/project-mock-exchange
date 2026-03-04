/**
 * @file 페이지 이동 시 스크롤 초기화 컴포넌트
 * @description pathname 변경 감지 시 화면 최상단으로 자동 스크롤
 *
 * @file Scroll To Top Component
 * @description Automatically scrolls to top of page when pathname changes
 */
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const pathname = usePathname();

  // 라우트 변경 시 스크롤 위치 초기화 / Reset scroll position on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
