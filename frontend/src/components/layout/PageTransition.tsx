/**
 * @file 페이지 전환 애니메이션 래퍼
 * @description 라우트 변경 시 짧은 페이드 전환 효과를 적용하는 클라이언트 컴포넌트
 *
 * @file Page Transition Animation Wrapper
 * @description Client component that applies a brief fade transition on route changes
 *
 * ANI-H-01: 페이지 전환 애니메이션 — usePathname()으로 경로 감지 후 200ms opacity 전환
 * ANI-H-01: Page transition animation — detect route via usePathname(), 200ms opacity transition
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 페이드 전환 지속시간 (ms)
// Fade transition duration (ms)
const FADE_DURATION = 200;

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [opacity, setOpacity] = useState(1);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // 경로가 변경되면 페이드인 효과 적용
    // Apply fade-in effect when route changes
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setOpacity(0);
      // requestAnimationFrame으로 브라우저 렌더 사이클 보장
      // Use requestAnimationFrame to ensure browser render cycle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(1);
        });
      });
    }
  }, [pathname]);

  return (
    <div
      style={{
        opacity,
        transition: `opacity ${FADE_DURATION}ms ease-in-out`,
      }}
    >
      {children}
    </div>
  );
}
