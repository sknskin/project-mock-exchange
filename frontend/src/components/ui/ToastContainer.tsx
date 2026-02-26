/**
 * @file 토스트 컨테이너
 * @description 화면 하단 중앙에 토스트 알림을 표시하는 컴포넌트
 *              default=무색, info=초록, error=빨강, success=파랑
 *
 * @file Toast Container
 * @description Displays toast notifications at the bottom center of the screen
 *              default=neutral, info=green, error=red, success=blue
 */
'use client';

import { useToastStore, type ToastType } from '@/stores/toast';

const STYLE_MAP: Record<ToastType, string> = {
  default: 'border-border bg-bg-elevated text-text-primary',
  info:    'border-success/40 bg-success/10 text-success',
  error:   'border-rise/40 bg-rise/10 text-rise',
  success: 'border-fall/40 bg-fall/10 text-fall',
};

const ICON_MAP: Record<ToastType, string> = {
  default: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  info:    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  error:   'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2.5 pointer-events-none w-[calc(100%-2rem)] sm:w-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-toast-fade flex items-center gap-2.5 border rounded-xl shadow-lg px-5 py-3 sm:px-6 sm:py-3.5 text-sm sm:text-[15px] font-semibold max-w-full sm:max-w-md ${STYLE_MAP[toast.type]}`}
        >
          <svg
            className="w-5 h-5 sm:w-[22px] sm:h-[22px] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={ICON_MAP[toast.type]} />
          </svg>
          <span className="break-words">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
