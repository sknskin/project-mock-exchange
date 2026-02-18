'use client';

import { useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface ResidentNumberInputProps {
  front: string;
  back: string;
  onFrontChange: (value: string) => void;
  onBackChange: (value: string) => void;
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
