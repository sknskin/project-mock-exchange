/**
 * @file 키보드 단축키 도움말 컴포넌트
 * @description '?' 키로 열리는 키보드 단축키 도움말 모달 (전역 키 핸들러 포함)
 *
 * @file Keyboard Shortcuts Help Component
 * @description Keyboard shortcuts help modal opened with '?' key (includes global key handler)
 *
 * UX-M-03: 키보드 단축키 도움말 — ? 키로 열기, Esc로 닫기
 * UX-M-03: Keyboard shortcuts help — open with ?, close with Esc
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { TranslationKey } from '@/lib/i18n';

// 입력 필드 태그명 — 이 요소에 포커스되어 있으면 단축키를 무시
// Input field tag names — shortcuts are ignored when these elements are focused
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

interface ShortcutEntry {
  /** 단축키 표시 문자열 / Shortcut key display string */
  keys: string[];
  /** 번역 키 / Translation key */
  descriptionKey: TranslationKey;
}

// 단축키 목록 / Shortcut list
const SHORTCUTS: ShortcutEntry[] = [
  { keys: ['?'], descriptionKey: 'shortcuts.openHelp' },
  { keys: ['Esc'], descriptionKey: 'shortcuts.closeModal' },
  { keys: ['/'], descriptionKey: 'shortcuts.focusSearch' },
  { keys: ['G', 'D'], descriptionKey: 'shortcuts.gotoDashboard' },
  { keys: ['G', 'P'], descriptionKey: 'shortcuts.gotoPortfolio' },
  { keys: ['G', 'T'], descriptionKey: 'shortcuts.gotoTrading' },
  { keys: ['G', 'C'], descriptionKey: 'shortcuts.gotoChat' },
];

export default function KeyboardShortcutsHelp() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);
  useScrollLock(isOpen);

  const handleClose = useCallback(() => setIsOpen(false), []);

  // 전역 키보드 이벤트: ? 키로 모달 열기
  // Global keyboard event: open modal with ? key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스되어 있으면 무시 / Ignore if focused on input fields
      const target = e.target as HTMLElement;
      if (INPUT_TAGS.has(target.tagName) || target.isContentEditable) return;

      // ? 키 (Shift + /) — 모달 토글 / ? key (Shift + /) — toggle modal
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // ESC로 닫기 / Close with Esc
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" ref={modalRef}>
      {/* 배경 오버레이 / Background overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop" onClick={handleClose} />

      {/* 모달 본문 / Modal body */}
      <div className="relative w-[90vw] max-w-[480px] bg-bg-primary rounded-2xl border border-border shadow-2xl overflow-hidden animate-modal-content">
        {/* 헤더 / Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent" />
            <h2 id="shortcuts-title" className="text-[16px] font-bold text-text-primary">
              {t('shortcuts.title')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 단축키 목록 / Shortcut list */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.descriptionKey} className="flex items-center justify-between">
              <span className="text-[14px] text-text-secondary">
                {t(shortcut.descriptionKey)}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-[12px] font-mono font-medium text-text-primary bg-bg-secondary border border-border rounded-md shadow-sm">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="mx-0.5 text-[11px] text-text-tertiary">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 푸터 / Footer */}
        <div className="flex justify-center px-5 py-3 border-t border-border">
          <p className="text-[12px] text-text-tertiary">
            {t('shortcuts.hint')}
          </p>
        </div>
      </div>
    </div>
  );
}
