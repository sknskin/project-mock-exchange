/**
 * @file 입력 컴포넌트
 * @description 라벨, 에러 메시지, 영문 전용 모드를 지원하는 공통 입력 필드
 *
 * @file Input Component
 * @description Common input field with label, error message, and english-only mode support
 */
'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useId } from 'react';
import { cn } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';

// 입력 필드 Props — 네이티브 input 속성 확장 / Input Props — extends native input attributes
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 입력 필드 라벨
   * Input field label */
  label?: string;
  /** 에러 메시지
   * Error message */
  error?: string;
  /** 영문 전용 모드 (한글 입력 자동 제거)
   * English-only mode (auto-strips Korean input) */
  englishOnly?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  label,
  error,
  englishOnly,
  className,
  onChange,
  id: externalId,
  ...props
}: InputProps, ref) {
  const { t } = useTranslation();
  const [koreanWarning, setKoreanWarning] = useState(false);
  const warningTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A11Y-M-02: 고유 ID 생성 — htmlFor와 aria-describedby 링크에 사용
  // A11Y-M-02: Generate unique ID — used for htmlFor and aria-describedby linking
  const autoId = useId();
  const inputId = externalId || autoId;
  const errorId = `${inputId}-error`;
  const warningId = `${inputId}-warning`;

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

  // A11Y-M-02: aria-describedby — 에러/경고 메시지 연결
  // A11Y-M-02: aria-describedby — link error/warning messages
  const describedBy = [
    error ? errorId : null,
    koreanWarning && !error ? warningId : null,
    props['aria-describedby'],
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        // A11Y-M-02: htmlFor로 라벨과 입력 필드 연결 / Link label to input field via htmlFor
        <label htmlFor={inputId} className="block text-[13px] text-text-secondary font-semibold mb-2">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          'w-full h-12 px-4 bg-bg-secondary border border-border/60 rounded-xl text-text-primary placeholder-text-quaternary',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent/40',
          'transition-all duration-150 text-[15px] font-medium',
          error && 'ring-2 ring-danger/20 border-danger/40',
          className,
        )}
        onChange={handleChange}
        {...props}
      />
      {error && <p id={errorId} className="mt-1.5 text-[13px] text-danger">{error}</p>}
      {koreanWarning && !error && (
        <p id={warningId} className="mt-1 text-[11px] text-warning font-medium">{t('validation.englishOnly')}</p>
      )}
    </div>
  );
});

export default Input;
