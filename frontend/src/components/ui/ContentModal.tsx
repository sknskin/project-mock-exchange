/**
 * @file 콘텐츠 모달 컴포넌트
 * @description 마크다운 또는 iframe 콘텐츠를 표시하는 전체화면/중앙 모달
 *
 * @file Content Modal Component
 * @description Fullscreen/centered modal displaying markdown or iframe content
 */
'use client';

import { useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type: 'markdown' | 'iframe';
}

export default function ContentModal({ isOpen, onClose, title, content, type }: ContentModalProps) {
  const { t } = useTranslation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      <div className="relative w-full h-full md:h-auto md:max-w-[960px] md:max-h-[85vh] bg-bg-primary md:rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-[17px] font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {type === 'markdown' ? (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <iframe
              src={content}
              className="w-full h-full min-h-[60vh] border-0 rounded-lg"
              title={title}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-center px-6 py-4 border-t border-border shrink-0">
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
