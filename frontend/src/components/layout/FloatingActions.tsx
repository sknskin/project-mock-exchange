/**
 * @file 플로팅 액션 버튼
 * @description 스크롤 맨 위로, 설정 등의 플로팅 액션 버튼
 *
 * @file Floating Action Buttons
 * @description Floating action buttons for scroll-to-top, settings, etc.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronUp, Settings, Sun, Moon, Globe, X } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';

export default function FloatingActions() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme, locale, toggleLocale } = useSettingsStore();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-[72px] md:bottom-8 right-5 sm:right-8 z-50 flex flex-col items-end gap-2.5">
      {/* 설정 패널 / Settings Panel */}
      {showSettings && (
        <div
          ref={panelRef}
          className="mb-2 w-[220px] bg-bg-elevated border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[13px] font-bold text-text-primary">
              {t('settings.title')}
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 text-text-quaternary hover:text-text-primary transition-colors rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-1.5">
            {/* 테마 전환 / Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-bg-secondary transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-[18px] h-[18px] text-warning" />
              ) : (
                <Moon className="w-[18px] h-[18px] text-accent" />
              )}
              <span className="text-[13px] font-medium text-text-primary">
                {theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
              </span>
            </button>

            {/* 언어 전환 / Language Toggle */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-bg-secondary transition-colors"
            >
              <Globe className="w-[18px] h-[18px] text-accent" />
              <span className="text-[13px] font-medium text-text-primary">
                {locale === 'ko' ? 'English' : '한국어'}
              </span>
            </button>
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="w-11 h-11 rounded-full bg-accent text-white shadow-lg shadow-accent/25 flex items-center justify-center hover:bg-accent/85 transition-colors"
          aria-label={t('scrollTop')}
        >
          <ChevronUp className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={cn(
          'w-11 h-11 rounded-full border shadow-lg flex items-center justify-center transition-colors',
          showSettings
            ? 'bg-accent text-white border-accent'
            : 'bg-bg-elevated border-border text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary',
        )}
        aria-label={t('settings.title')}
      >
        <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </button>
    </div>
  );
}
