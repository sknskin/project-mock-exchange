/**
 * @file 번역 훅
 * @description 현재 언어 설정에 따라 번역 함수를 제공합니다
 *
 * @file Translation Hook
 * @description Provides translation function based on current locale setting
 */
'use client';

import { useSettingsStore } from '@/stores/settings';
import { t, type TranslationKey, type Locale } from '@/lib/i18n';

export function useTranslation() {
  const locale = useSettingsStore((s) => s.locale);

  return {
    t: (key: TranslationKey) => t(key, locale),
    locale,
  };
}
