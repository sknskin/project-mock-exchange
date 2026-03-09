/**
 * @file 번역 훅
 * @description 현재 언어 설정에 따라 번역 함수를 제공합니다
 *
 * @file Translation Hook
 * @description Provides translation function based on current locale setting
 */
'use client';

import { useSettingsStore } from '@/stores/settings';
import { t, type TranslationKey } from '@/lib/i18n';

/**
 * 현재 설정된 언어(locale)에 따라 번역 함수(t)를 제공하는 훅
 * 내부적으로 Zustand settings 스토어에서 locale을 구독하여, 언어 변경 시 자동 리렌더링됩니다.
 *
 * Hook that provides a translation function (t) based on the current locale setting.
 * Internally subscribes to the Zustand settings store locale, auto-re-renders on language change.
 *
 * @returns {{ t: (key: TranslationKey) => string, locale: Locale }}
 *   - t: 번역 키를 받아 현재 locale의 문자열 반환 / Takes a translation key, returns localized string
 *   - locale: 현재 언어 설정 / Current locale setting
 */
export function useTranslation() {
  // Zustand 스토어에서 현재 locale을 구독 / Subscribe to current locale from Zustand store
  const locale = useSettingsStore((s) => s.locale);

  return {
    // i18n 라이브러리의 t 함수에 현재 locale을 바인딩 / Bind current locale to the i18n t function
    t: (key: TranslationKey) => t(key, locale),
    locale,
  };
}
