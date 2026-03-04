/**
 * @file 설정 스토어
 * @description Zustand persist로 관리하는 테마, 언어 설정
 *
 * @file Settings Store
 * @description Zustand persisted store for theme and language settings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/lib/i18n';

// 테마 타입 / Theme type
export type Theme = 'dark' | 'light';

// 알림 설정 인터페이스 / Notification preferences interface
export interface NotificationPrefs {
  /** 거래 알림 / Trade notifications */
  trade: boolean;
  /** 가격 알림 / Price alert notifications */
  priceAlert: boolean;
  /** 채팅 알림 / Chat notifications */
  chat: boolean;
  /** 공지사항 알림 / Announcement notifications */
  announcement: boolean;
  /** 가입 승인 알림 / Registration approval notifications */
  registration: boolean;
}

const defaultNotificationPrefs: NotificationPrefs = {
  trade: true,
  priceAlert: true,
  chat: true,
  announcement: true,
  registration: true,
};

// 설정 상태 인터페이스 / Settings state interface
interface SettingsState {
  /** 현재 테마 / Current theme */
  theme: Theme;
  /** 현재 로케일 / Current locale */
  locale: Locale;
  /** 알림 설정 / Notification preferences */
  notificationPrefs: NotificationPrefs;
  setTheme: (theme: Theme) => void;
  /** 테마 토글 (dark <-> light) / Toggle theme (dark <-> light) */
  toggleTheme: () => void;
  setLocale: (locale: Locale) => void;
  /** 로케일 토글 (ko <-> en) / Toggle locale (ko <-> en) */
  toggleLocale: () => void;
  /** 개별 알림 설정 변경 / Change individual notification preference */
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      locale: 'ko',
      notificationPrefs: defaultNotificationPrefs,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'ko' ? 'en' : 'ko' }),
      setNotificationPref: (key, value) =>
        set({ notificationPrefs: { ...get().notificationPrefs, [key]: value } }),
    }),
    {
      name: 'virtuex-settings',
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        notificationPrefs: state.notificationPrefs,
      }),
    },
  ),
);
