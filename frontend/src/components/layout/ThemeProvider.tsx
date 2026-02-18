/**
 * @file 테마 프로바이더
 * @description 다크/라이트 모드를 HTML 클래스로 적용하는 테마 관리 컴포넌트
 *
 * @file Theme Provider
 * @description Theme management component applying dark/light mode via HTML class
 */
'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings';

export default function ThemeProvider() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  return null;
}
