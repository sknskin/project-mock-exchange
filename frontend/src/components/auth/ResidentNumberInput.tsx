/**
 * @file 주민등록번호 입력 컴포넌트
 * @description 앞자리/뒷자리 분리 입력과 마스킹 처리를 제공합니다
 *
 * @file Resident Number Input Component
 * @description Provides split front/back digit input with masking
 */
'use client';

import { useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

// 주민등록번호 입력 Props / Resident Number Input Props
interface ResidentNumberInputProps {
  /** 앞자리 6자리 / Front 6 digits */
  front: string;
  /** 뒷자리 7자리 / Back 7 digits */
  back: string;
  /** 앞자리 변경 콜백 / Front digit change callback */
  onFrontChange: (value: string) => void;
  /** 뒷자리 변경 콜백 / Back digit change callback */
  onBackChange: (value: string) => void;
  /** 에러 메시지 / Error message */
  error?: string;
}

export default function ResidentNumberInput({
  front,
  back,
  onFrontChange,
  onBackChange,
  error,
}: ResidentNumberInputProps) {
  const { t } = useTranslation();
  const backRef = useRef<HTMLInputElement>(null);

  const handleFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    onFrontChange(val);
    if (val.length === 6) {
      backRef.current?.focus();
    }
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 7);
    onBackChange(val);
  };

  // 뒷자리 마스킹: 첫 자리만 표시하고 나머지는 ● 처리 / Back digit masking: show only first digit, mask rest with ●
  const maskedBack = back.length > 0
    ? back[0] + '●'.repeat(Math.min(back.length - 1, 6))
    : '';

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder={t('auth.register.residentFront')}
          value={front}
          onChange={handleFrontChange}
          maxLength={6}
          className="w-full h-12 px-4 bg-bg-secondary border border-border/60 rounded-xl text-text-primary placeholder-text-quaternary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-150 text-[15px] font-medium text-center tracking-widest"
        />
        <span className="text-text-quaternary text-[18px] font-bold">-</span>
        <div className="relative w-full">
          <input
            ref={backRef}
            type="text"
            inputMode="numeric"
            placeholder={t('auth.register.residentBack')}
            value={back}
            onChange={handleBackChange}
            maxLength={7}
            className="w-full h-12 px-4 bg-bg-secondary border border-border/60 rounded-xl text-transparent placeholder-text-quaternary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-150 text-[15px] font-medium text-center tracking-widest caret-text-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[15px] font-medium tracking-widest text-text-primary">
            {maskedBack}
          </div>
        </div>
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
