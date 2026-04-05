/**
 * @file 테마 프로바이더
 * @description 다크/라이트 모드를 HTML 클래스로 적용하는 테마 관리 컴포넌트
 *
 * @file Theme Provider
 * @description Theme management component applying dark/light mode via HTML class
 */
'use client';

import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settings';

export default function ThemeProvider() {
  const theme = useSettingsStore((s) => s.theme);
  // PERF-13-15: 초기 마운트 시에는 트랜지션 클래스를 추가하지 않음 — 첫 렌더링 깜빡임 방지
  // PERF-13-15: Skip transitioning class on initial mount — prevents flash on first render
  const isInitialMount = useRef(true);

  useEffect(() => {
    const root = document.documentElement;

    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      // PERF-13-15: 테마 전환 시에만 트랜지션 클래스를 추가하여 부드러운 전환 효과 적용
      // PERF-13-15: Add transitioning class only during theme change for smooth transition effect
      root.classList.add('theme-transitioning');
    }

    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }

    // PERF-13-15: 트랜지션 완료 후 클래스 제거 — 평소 불필요한 transition 비용 제거
    // PERF-13-15: Remove class after transition completes — eliminates unnecessary transition cost at rest
    const timer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);

    return () => clearTimeout(timer);
  }, [theme]);

  return null;
}
