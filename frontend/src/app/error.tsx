/**
 * @file 오류 페이지
 * @description 런타임 에러 발생 시 표시되는 에러 바운더리 UI
 *
 * @file Error Page
 * @description Error boundary UI displayed on runtime errors
 */
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';


const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
    <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
  </svg>
);

interface Toast {
  id: number;
  text: string;
  x: number;
  y: number;
}

let toastId = 0;

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const copyToClipboard = useCallback(async (text: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    const id = ++toastId;
    setToasts((prev) => [
      ...prev,
      { id, text: t('toast.copied'), x: rect.right + 8, y: rect.top + rect.height / 2 },
    ]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 1500);
  }, [t]);

  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
      {/* 아이콘 */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-danger/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-10 h-10 text-danger"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
      </div>

      {/* 제목 + 설명 */}
      <h1 className="text-[24px] font-extrabold text-text-primary mb-3">
        {t('error.title')}
      </h1>
      <p className="text-[14px] text-text-secondary max-w-[400px] leading-relaxed mb-2 whitespace-pre-line">
        {t('error.description')}
      </p>
      <p className="text-[13px] text-text-tertiary max-w-[400px] leading-relaxed mb-8">
        {t('error.persistent')}
      </p>

      {/* 연락처 */}
      {(process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_PHONE) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mb-8 px-4 py-3 rounded-xl bg-bg-secondary/60 border border-border">
          {process.env.NEXT_PUBLIC_CONTACT_EMAIL && (
            <button
              onClick={(e) => copyToClipboard(process.env.NEXT_PUBLIC_CONTACT_EMAIL!, e)}
              className="flex items-center gap-1.5 text-[12px] text-text-quaternary hover:text-text-secondary transition-colors cursor-pointer"
              title={process.env.NEXT_PUBLIC_CONTACT_EMAIL}
            >
              <MailIcon />
              <span>{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</span>
            </button>
          )}
          {process.env.NEXT_PUBLIC_CONTACT_EMAIL && process.env.NEXT_PUBLIC_CONTACT_PHONE && (
            <span className="hidden sm:block w-px h-3 bg-border" />
          )}
          {process.env.NEXT_PUBLIC_CONTACT_PHONE && (
            <button
              onClick={(e) => copyToClipboard(process.env.NEXT_PUBLIC_CONTACT_PHONE!, e)}
              className="flex items-center gap-1.5 text-[12px] text-text-quaternary hover:text-text-secondary transition-colors cursor-pointer"
              title={process.env.NEXT_PUBLIC_CONTACT_PHONE}
            >
              <PhoneIcon />
              <span>{process.env.NEXT_PUBLIC_CONTACT_PHONE}</span>
            </button>
          )}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="h-10 px-6 text-[14px] font-bold text-white bg-accent rounded-xl hover:bg-accent/85 transition-colors"
        >
          {t('error.retry')}
        </button>
        <a
          href="/"
          className="h-10 px-6 text-[14px] font-semibold text-text-secondary bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition-colors flex items-center"
        >
          {t('error.goHome')}
        </a>
      </div>

      {/* 커서 기준 토스트 알림 / Cursor-relative toast notifications */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="fixed z-50 pointer-events-none animate-toast-fade"
          style={{ left: toast.x, top: toast.y, transform: 'translateY(-50%)' }}
        >
          <div className="bg-bg-elevated border border-border text-text-primary text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
            {toast.text}
          </div>
        </div>
      ))}
    </div>
  );
}
