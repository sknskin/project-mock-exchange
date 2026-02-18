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
