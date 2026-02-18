'use client';

import { useTranslation } from '@/hooks/useTranslation';
import type { ValidationRule } from '@/lib/validation';
import type { TranslationKey } from '@/lib/i18n';

interface ValidationFeedbackProps {
  rules: ValidationRule[];
  show: boolean;
}

export default function ValidationFeedback({ rules, show }: ValidationFeedbackProps) {
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <ul className="mt-1.5 space-y-0.5">
      {rules.map((rule) => (
        <li
          key={rule.key}
          className={`flex items-center gap-1.5 text-[12px] font-medium ${
            rule.passed ? 'text-rise' : 'text-text-quaternary'
          }`}
        >
          <span className="text-[11px]">{rule.passed ? '✓' : '✗'}</span>
          {t(rule.key as TranslationKey)}
        </li>
      ))}
    </ul>
  );
}
