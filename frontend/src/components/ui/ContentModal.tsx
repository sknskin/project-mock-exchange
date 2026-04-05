/**
 * @file 콘텐츠 모달 컴포넌트
 * @description 마크다운 또는 iframe 콘텐츠를 표시하는 전체화면/중앙 모달
 *
 * @file Content Modal Component
 * @description Fullscreen/centered modal displaying markdown or iframe content
 */
'use client';

import { memo, useEffect, useCallback, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/format';

// ANI-M-04: 닫기 애니메이션 지속시간 (ms)
// ANI-M-04: Close animation duration (ms)
const CLOSE_ANIMATION_DURATION = 200;

/* 테이블을 스크롤 가능한 래퍼로 감싸기 (Wrap table in scrollable wrapper for mobile) */
function TableWrapper(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="markdown-table-wrapper">
      <table {...props} />
    </div>
  );
}

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type: 'markdown' | 'iframe';
}

function ContentModal({ isOpen, onClose, title, content, type }: ContentModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  // ANI-M-04: 닫기 애니메이션 상태 / Close animation state
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);

  useFocusTrap(modalRef, isOpen && !closing);
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    }
  }, [isOpen]);

  // ANI-M-04: 닫기 애니메이션 트리거 후 onClose 호출
  // ANI-M-04: Trigger close animation then call onClose
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onClose();
    }, CLOSE_ANIMATION_DURATION);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    },
    [handleClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, handleKeyDown]);

  if (!isOpen && !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="content-modal-title" ref={modalRef}>
      {/* ANI-M-04: 백드롭 — 닫기 시 페이드아웃 / Backdrop — fade-out on close */}
      <div className={cn('absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer', closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop')} onClick={handleClose} />

      {/* ANI-M-04: 모달 본체 — 열림/닫힘 애니메이션 / Modal body — open/close animation */}
      <div className={cn('relative w-full h-full md:h-auto md:max-w-[960px] md:max-h-[85vh] bg-bg-primary md:rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl max-w-[100vw]', closing ? 'animate-modal-content-out' : 'animate-modal-content')}>
        {/* 헤더 / Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
          <h2 id="content-modal-title" className="text-[15px] sm:text-[17px] font-bold text-text-primary truncate mr-2">{title}</h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 / Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:p-6">
          {type === 'markdown' ? (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: TableWrapper }}>{content}</ReactMarkdown>
            </div>
          ) : (
            <iframe
              src={content}
              className="w-full h-full min-h-[60vh] border-0 rounded-lg"
              title={title}
            />
          )}
        </div>

        {/* 푸터 / Footer */}
        <div className="flex justify-center px-4 sm:px-6 py-3 sm:py-4 border-t border-border shrink-0">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-[14px] font-bold text-white bg-accent hover:bg-accent/85 rounded-lg transition-colors cursor-pointer"
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ContentModal);
