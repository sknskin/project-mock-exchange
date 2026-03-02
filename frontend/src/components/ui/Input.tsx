/**
 * @file 입력 컴포넌트
 * @description 라벨, 에러 메시지, 영문 전용 모드를 지원하는 공통 입력 필드
 *
 * @file Input Component
 * @description Common input field with label, error message, and english-only mode support
 */
'use client';

import { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  englishOnly?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  label,
  error,
  englishOnly,
  className,
  onChange,
  ...props
}: InputProps, ref) {
  const { t } = useTranslation();
  const [koreanWarning, setKoreanWarning] = useState(false);
  const warningTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(warningTimer.current), []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (englishOnly) {
      const raw = e.target.value;
      const cleaned = raw.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
      if (raw !== cleaned) {
        setKoreanWarning(true);
        clearTimeout(warningTimer.current);
        warningTimer.current = setTimeout(() => setKoreanWarning(false), 2000);
        e.target.value = cleaned;
      }
    }
    onChange?.(e);
  }, [englishOnly, onChange]);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] text-text-secondary font-semibold mb-2">
          {label}
        </label>
      )}
      <input
        ref={ref}
        aria-invalid={!!error}
        className={cn(
          'w-full h-12 px-4 bg-bg-secondary border border-border/60 rounded-xl text-text-primary placeholder-text-quaternary',
          'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40',
          'transition-all duration-150 text-[15px] font-medium',
          error && 'ring-2 ring-danger/20 border-danger/40',
          className,
        )}
        onChange={handleChange}
        {...props}
      />
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      {koreanWarning && !error && (
        <p className="mt-1 text-[11px] text-warning font-medium">{t('validation.englishOnly')}</p>
      )}
    </div>
  );
});

export default Input;
