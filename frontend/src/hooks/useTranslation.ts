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
