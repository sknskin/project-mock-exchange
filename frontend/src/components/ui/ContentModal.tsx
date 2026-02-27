/**
 * @file 콘텐츠 모달 컴포넌트
 * @description 마크다운 또는 iframe 콘텐츠를 표시하는 전체화면/중앙 모달
 *
 * @file Content Modal Component
 * @description Fullscreen/centered modal displaying markdown or iframe content
 */
'use client';

import { useEffect, useCallback, useRef, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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

export default function ContentModal({ isOpen, onClose, title, content, type }: ContentModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    // 모바일에서도 배경 스크롤 완전 차단 (Block background scroll on mobile too)
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="content-modal-title" ref={modalRef}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      <div className="relative w-full h-full md:h-auto md:max-w-[960px] md:max-h-[85vh] bg-bg-primary md:rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl max-w-[100vw]">
        {/* 헤더 / Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
          <h2 id="content-modal-title" className="text-[15px] sm:text-[17px] font-bold text-text-primary truncate mr-2">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 / Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
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
            onClick={onClose}
            className="px-6 py-2.5 text-[14px] font-bold text-white bg-danger hover:bg-danger/85 rounded-lg transition-colors cursor-pointer"
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
