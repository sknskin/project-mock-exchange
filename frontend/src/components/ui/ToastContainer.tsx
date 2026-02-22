/**
 * @file 토스트 컨테이너
 * @description 화면 하단 중앙에 토스트 알림을 표시하는 컴포넌트
 *
 * @file Toast Container
 * @description Component that displays toast notifications at the bottom center of the screen
 */
'use client';

import { useToastStore } from '@/stores/toast';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-toast-fade bg-bg-elevated border border-border text-text-primary text-[13px] font-medium px-5 py-2.5 rounded-xl shadow-lg whitespace-nowrap"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
