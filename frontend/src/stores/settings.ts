import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/lib/i18n';

export type Theme = 'dark' | 'light';

interface SettingsState {
  theme: Theme;
  locale: Locale;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      locale: 'ko',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'ko' ? 'en' : 'ko' }),
    }),
    {
      name: 'mockx-settings',
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
      }),
    },
  ),
);
