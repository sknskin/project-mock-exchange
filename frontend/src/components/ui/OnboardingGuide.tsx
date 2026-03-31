/**
 * @file 온보딩 가이드 컴포넌트
 * @description 첫 방문 사용자에게 주요 기능을 소개하는 스텝 모달 (localStorage로 노출 제어)
 *
 * @file Onboarding Guide Component
 * @description Step-by-step modal introducing key features to first-time visitors (controlled via localStorage)
 *
 * UX-M-01: 첫 방문 온보딩 — dashboard, trading, portfolio, chat 영역 소개
 * UX-M-01: First-visit onboarding — introduces dashboard, trading, portfolio, chat areas
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, TrendingUp, Briefcase, MessageCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';

// localStorage 키 / localStorage key
const ONBOARDED_KEY = 'virtuex-onboarded';

// 온보딩 스텝 아이콘 매핑 / Onboarding step icon mapping
const STEP_ICONS = [LayoutDashboard, TrendingUp, Briefcase, MessageCircle] as const;

// 총 온보딩 스텝 수 / Total number of onboarding steps
const TOTAL_STEPS = 4;

export default function OnboardingGuide() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);
  useScrollLock(isOpen);

  // 첫 방문 여부 확인 / Check if first visit
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem(ONBOARDED_KEY);
      if (!onboarded) {
        setIsOpen(true);
      }
    } catch (e) {
      // localStorage 접근 실패 시 무시 (private 모드 등)
      // Ignore localStorage access failure (e.g., private mode)
      console.warn('OnboardingGuide: localStorage access failed', e);
    }
  }, []);

  // 온보딩 완료 처리 / Mark onboarding as complete
  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1');
    } catch (e) {
      console.warn('OnboardingGuide: localStorage write failed', e);
    }
    setIsOpen(false);
  }, []);

  // 다음 스텝 / Next step
  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, handleComplete]);

  // 이전 스텝 / Previous step
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // ESC 키로 닫기 / Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleComplete();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, handleComplete]);

  if (!isOpen) return null;

  // 현재 스텝의 번역 키에서 제목과 설명 가져오기
  // Get title and description from translation keys for current step
  const stepKeys = [
    { title: 'onboarding.step1.title', desc: 'onboarding.step1.desc' },
    { title: 'onboarding.step2.title', desc: 'onboarding.step2.desc' },
    { title: 'onboarding.step3.title', desc: 'onboarding.step3.desc' },
    { title: 'onboarding.step4.title', desc: 'onboarding.step4.desc' },
  ] as const;

  const StepIcon = STEP_ICONS[currentStep];
  const step = stepKeys[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" ref={modalRef}>
      {/* 배경 오버레이 / Background overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop" onClick={handleComplete} />

      {/* 모달 본문 / Modal body */}
      <div className="relative w-[90vw] max-w-[420px] bg-bg-primary rounded-2xl border border-border shadow-2xl overflow-hidden animate-modal-content">
        {/* 닫기 버튼 / Close button */}
        <button
          onClick={handleComplete}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 아이콘 영역 / Icon area */}
        <div className="flex justify-center pt-8 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <StepIcon className="w-8 h-8 text-accent" />
          </div>
        </div>

        {/* 콘텐츠 영역 / Content area */}
        <div className="px-6 pb-4 text-center">
          <h2 id="onboarding-title" className="text-[17px] font-bold text-text-primary mb-2">
            {t(step.title)}
          </h2>
          <p className="text-[14px] text-text-secondary leading-relaxed">
            {t(step.desc)}
          </p>
        </div>

        {/* 스텝 인디케이터 / Step indicator */}
        <div className="flex justify-center gap-1.5 pb-4">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* 네비게이션 버튼 / Navigation buttons */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-4 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('onboarding.prev')}
          </button>

          <button
            onClick={handleComplete}
            className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            {t('onboarding.skip')}
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2.5 text-[13px] font-bold text-white bg-accent hover:bg-accent/85 rounded-lg transition-colors cursor-pointer"
          >
            {currentStep === TOTAL_STEPS - 1 ? t('onboarding.start') : t('onboarding.next')}
            {currentStep < TOTAL_STEPS - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
